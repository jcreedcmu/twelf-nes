import { CSSProperties } from "react";
import Tex from './katex';
import { isExactTok, pcEqual } from "./program-counter";
import { in_range } from "./range";
import { CtlEntry, CtxEntry, Dispatch, Expr, MetaCtx, MetaCtxEntry, Pc, Selection, Sig, SigEntry, Stack, StackEntry, State, SubEntry, Tok } from "./state-types";

export function stringOfTok(tok: Tok): string {
  switch (tok.t) {
    case 'type': return '*';
    case '->': return '→';
    case 'grab': return '▷';
    case 'ret': return '⤶';
    case '.': return '.';
    case 'id': {
      if (tok.name == 'ell')
        return 'ℓ';
      else
        return tok.name;
    }
    case ':': return ':';
    case '(': return '(';
    case ')': return ')';
    case '[': return '[';
    case ']': return ']';
  }
}

export function rawTok(tok: Tok): string {
  switch (tok.t) {
    case 'id':
      return tok.name;
    default:
      return tok.t;
  }
}

export function texOfName(name: string): string {
  if (name == 'ell')
    return '\\ell';
  else
    return name;
}

function appToSpineTex(head: string, spine: Expr[]): string {
  if (spine.length == 0)
    return head;
  else
    return `${head}\\cdot(${spine.map(exprToTex).join(",")})`;
}

function exprToTex(e: Expr): string {
  switch (e.t) {
    case 'type': return '\\mathsf{type}';
    case 'kind': return '\\mathsf{kind}';
    case 'pi': return e.name == undefined ? `(${exprToTex(e.a)}) \\to ${exprToTex(e.b)}`
      : `\\left( \\prod_{ ${e.name} {:} ${exprToTex(e.a)}}  ${exprToTex(e.b)} \\right)`;
    case 'lam': return ` \\lambda ( ${e.name ?? '_'} {:} ${exprToTex(e.a)}).  ${exprToTex(e.m)} `;
    case 'appc': return appToSpineTex(texOfName(e.cid), e.spine);
    case 'appv': return appToSpineTex(texOfName(e.head), e.spine);
  }
}

function isTokenHilighted(state: State, sel: Selection, pc: Pc): boolean {
  switch (sel.t) {
    case 'sigItem': return in_range(pc, state.sig[sel.index].program);
    case 'ctlItem': return false; // pcEqual(state.ctl[sel.index].pc, pc); // XXX?
  }
}

function renderToksForPc(pc: Pc, state: State, dispatch: Dispatch, currentSelection: Selection | undefined, active: boolean): JSX.Element {
  switch (pc.t) {
    case 'tokstream': return renderToks(pc.index, state, dispatch, currentSelection, active);
    case 'sigEntry': return renderToksForSigEntry(pc.tokIx, state.sig[pc.sigIx], state, dispatch, currentSelection, active);
  }
}

function renderToksForSigEntry(offset: number, se: SigEntry, state: State, dispatch: Dispatch, currentSelection: Selection | undefined, active: boolean): JSX.Element {
  let i = 0;
  const row: JSX.Element[] = [];
  for (const tok of se.code) {
    const className = ['token'];
    if (offset == i) className.push(active ? 'active' : 'latent');
    const str = stringOfTok(tok);
    const elt = <div className={className.join(' ')}>{str}</div>;
    row.push(elt);
    i++;
  }
  return <div>{row}</div>;
}

function renderToks(offset: number, state: State, dispatch: Dispatch, currentSelection: Selection | undefined, active: boolean): JSX.Element {
  let i = 0;
  function findPc(pc: number): (e: React.MouseEvent) => void {
    return e => dispatch({ t: 'findPc', pc });
  }
  const row: JSX.Element[] = [];
  for (const decl of state.origToks) {
    for (const tok of decl) {
      const className = ['token'];
      if (currentSelection != undefined && isTokenHilighted(state, currentSelection, { t: 'tokstream', index: i })) {
        className.push('hilited');
      }
      if (state.stack.find(sf => sf.t == 'control' && isExactTok(sf.cframe.pc, i))) className.push('latent');

      if (offset == i) className.push(active ? 'active' : 'latent');
      const str = stringOfTok(tok);
      const elt = <div className={className.join(' ')} onMouseDown={findPc(i)}>{str}</div>;
      row.push(elt);
      i++;
    }
    row.push(<br />);
  }
  return <div>{row}</div>;
}

function declToTex(decl: { name: string, klass: Expr }): string {
  return `${texOfName(decl.name)} : ${exprToTex(decl.klass)}`;
}

function subToTex(decl: { term: Expr, klass: Expr }): string {
  return `${exprToTex(decl.term)} : ${exprToTex(decl.klass)}`;
}

function renderSigEntry(sigent: SigEntry): JSX.Element {
  return <Tex expr={declToTex(sigent)} />;
}

function renderSig(sig: Sig, dispatch: Dispatch, currentSelection: Selection | undefined): JSX.Element {
  const str = sig.map((sigent, index) => {
    const buttonClass = ["sigbutton"];
    if (currentSelection !== undefined && currentSelection.t == 'sigItem' && index == currentSelection.index) {
      buttonClass.push('hilited');
    }
    return <div className={buttonClass.join(' ')} onMouseDown={e => { dispatch({ t: 'setCurrentSel', sel: { t: 'sigItem', index } }) }}>
      <Tex expr={declToTex(sigent) + '.'} />
    </div>;
  });
  return <div className="sigcontainer">{str}</div>;
}

function renderStackFrame(state: State, frame: StackEntry): JSX.Element {
  switch (frame.t) {
    case 'data':
      return <span><Tex expr={subToTex(frame)} /></span>;
    case 'control':
      return renderCtlEntry(state, frame.cframe, undefined, (e) => { }); // XXX these can't be clicked on
  }
}

function renderStack(state: State, stack: Stack): JSX.Element {
  const newline = "\n";

  const str = stack.map(x => renderStackFrame(state, x));

  return <div className="stackcontainer">{str}</div>;
}

function texOfSubEntry(e: SubEntry): string {
  return `[${exprToTex(e.term)}/${e.name ?? '\\_'}]:${exprToTex(e.klass)}`;
}

function texOfCtxEntry(e: CtxEntry): string {
  return `${e.name ?? '\\_'}:${exprToTex(e.klass)}`;
}

function texOfCtx(meta: MetaCtxEntry): string {
  switch (meta.t) {
    case 'sub': return meta.sub.map(texOfSubEntry).join(', ');
    case 'ctx': return meta.ctx.map(texOfCtxEntry).join(', ');
  }
}

function renderMeta(meta: MetaCtx): JSX.Element {
  const newline = "\n";

  const str = meta.map(e => {
    return <span><Tex expr={e.t + '(' + texOfCtx(e) + ')'} />{renderCode(e.code)}{newline}</span>;
  });

  return <pre>{str}</pre>;
}

function renderPc(state: State, pc: Pc): string {
  switch (pc.t) {
    case 'tokstream': return `${pc.index}`;
    case 'sigEntry': return `${state.sig[pc.sigIx].name}:${pc.tokIx}`;
  }
}

function renderCtlEntry(state: State, ctl: CtlEntry, currentSelection: Selection | undefined, dispatch: Dispatch, index?: number): JSX.Element {
  let name: (JSX.Element | string)[] = [''];
  const code = renderCode(ctl.code);
  if (ctl.readingName) {
    name = [`, name: `, <span style={{ color: 'red' }}>?</span>];
  }
  else if (ctl.name != undefined) {
    name = [`, name: ${ctl.name}`];
  }
  const onMouseDown = index == undefined ? undefined : (e: React.MouseEvent) => {
    dispatch({ t: 'setCurrentSel', sel: { t: 'ctlItem', index } });
  };
  const className: string[] = ["ctlbutton"];
  if (currentSelection != undefined && currentSelection.t == 'ctlItem' && index != undefined && currentSelection.index == index) {
    className.push('hilited');
  }
  return <span><div className={className.join(' ')} onMouseDown={onMouseDown}>
    {renderPc(state, ctl.pc)}
  </div>[{code}{name}]</span>;
}

type Lerp = JSX.Element | JSX.Element[];
function hsplit(x: Lerp, y: Lerp, frac?: number): JSX.Element {
  frac = frac ?? 0.5;
  const s: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
  }
  const s1: CSSProperties = {
    flexShrink: 0,
    flexGrow: frac,
    flexBasis: 0,
    borderRight: '1px solid black',
  }
  const s2: CSSProperties = {
    flexShrink: 0,
    flexGrow: 1 - frac,
    flexBasis: 0,
  }
  return <div style={s}><div style={s1} >{x}</div><div style={s2} >{y}</div></div>;
}

function renderCode(code: Tok[]): JSX.Element {
  return <div className="codeblock">{code.length > 0 ? code.map(stringOfTok).join(' ') : '\u00a0'}</div>;
}

export function showDupCurrentSelection(state: State, currentSelection: Selection | undefined): JSX.Element | undefined {
  if (currentSelection == undefined)
    return undefined;
  switch (currentSelection.t) {
    case 'sigItem': {
      const sigEntry = state.sig[currentSelection.index];
      return <div>{renderSigEntry(sigEntry)}<br />{renderCode(sigEntry.code)}</div>;
    }
    case 'ctlItem': return undefined;
  }
}

export function renderState(state: State, dispatch: Dispatch, currentSelection: Selection | undefined): JSX.Element {
  let stateRepn: JSX.Element[];
  const tdStyle: CSSProperties = {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    overflowX: 'hidden',
    borderRight: '1px solid black',
  };


  if (state.error != undefined) {
    stateRepn = [<td style={{ color: 'red' }}>ERROR: {state.error}</td>];
  }
  else {
    stateRepn =
      [
        <div style={tdStyle}>
          <b>Sig</b>:{renderSig(state.sig, dispatch, currentSelection)}
        </div>,
        <div style={tdStyle}>
          <b>Stack</b>:{renderStack(state, state.stack)}
        </div>,
        <div style={tdStyle}>
          <b>Meta</b>:{renderMeta(state.meta)}<br />
        </div>,
      ];
  }

  function renderAllCode(state: State, dispatch: Dispatch, currentSelection: Selection | undefined): JSX.Element {
    const pieces: JSX.Element[] = [];
    for (const sf of state.stack) {
      if (sf.t == 'control') {
        pieces.push(renderToksForPc(sf.cframe.pc, state, dispatch, currentSelection, false));
        pieces.push(<div style={{ width: '100%', height: 1, margin: '1em 0em', backgroundColor: 'gray' }} />);
      }
    }
    pieces.push(renderToksForPc(state.cframe.pc, state, dispatch, currentSelection, true));

    return <div style={{ display: 'flex', flexDirection: 'column' }}>{pieces}</div>;
  }

  const dupCurrentSelection = showDupCurrentSelection(state, currentSelection);
  return <div>
    <b>MetaCode</b>: {renderCode(state.metaCode)}<br />
    <b>Control</b>: {renderCtlEntry(state, state.cframe, currentSelection, dispatch)}<br />
    {hsplit(
      renderAllCode(state, dispatch, currentSelection),
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '100%' }}> {stateRepn}</div>,
      0.20
    )}<br />
    <center>{dupCurrentSelection}</center>
  </div>;
}
