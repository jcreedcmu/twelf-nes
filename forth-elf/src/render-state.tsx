import { tokenToString } from "typescript";
import { Action, Ctl, CtlEntry, CtxEntry, Expr, MetaCtx, MetaCtxEntry, Selection, Sig, SigEntry, Stack, State, SubEntry, Tok } from "./state-types";
import { Dispatch } from "./state-types";
import Tex from './katex';
import { CSSProperties } from "react";
import { Rng, in_range } from "./range";

export function stringOfTok(tok: Tok): string {
  switch (tok.t) {
    case 'type': return '*';
    case '->': return '→';
    case '.': return '.';
    case 'id': return tok.name;
    case ':': return ':';
    case '(': return '(';
    case ')': return ')';
    case '[': return '[';
    case ']': return ']';
  }
}

function appToSpine(head: string, spine: Expr[]): string {
  if (spine.length == 0)
    return head;
  else
    return `${head}·(${spine.map(exprToString).join(",")})`;
}

function appToSpineTex(head: string, spine: Expr[]): string {
  if (spine.length == 0)
    return head;
  else
    return `${head}\\cdot(${spine.map(exprToTex).join(",")})`;
}

function exprToString(e: Expr): string {
  switch (e.t) {
    case 'type': return 'Type';
    case 'kind': return 'Kind';
    case 'pi': return e.name == undefined ? `(${exprToString(e.a)} -> ${exprToString(e.b)})`
      : `{${e.name}:${exprToString(e.a)}} ${exprToString(e.b)}`;
    case 'appc': return appToSpine(e.cid, e.spine);
    case 'appv': return appToSpine(e.head, e.spine);
  }
}

function exprToTex(e: Expr): string {
  switch (e.t) {
    case 'type': return '\\mathsf{type}';
    case 'kind': return '\\mathsf{kind}';
    case 'pi': return e.name == undefined ? `(${exprToTex(e.a)} \\to ${exprToTex(e.b)})`
      : `\\left( \\prod_{ ${e.name} {:} ${exprToTex(e.a)}}  ${exprToTex(e.b)} \\right)`;
    case 'appc': return appToSpineTex(e.cid, e.spine);
    case 'appv': return appToSpineTex(e.head, e.spine);
  }
}

function isTokenHilighted(state: State, sel: Selection, pc: number): boolean {
  switch (sel.t) {
    case 'sigItem': return in_range(pc, state.sig[sel.index].program);
    case 'ctlItem': return state.ctl[sel.index].pc == pc;
  }
}

function renderToks(state: State, dispatch: Dispatch, currentSelection: Selection | undefined): JSX.Element {
  let i = 0;
  function findPc(pc: number): (e: React.MouseEvent) => void {
    return e => dispatch({ t: 'findPc', pc });
  }
  const row: JSX.Element[] = [];
  for (const decl of state.origToks) {
    for (const tok of decl) {
      const className = ['token'];
      if (currentSelection != undefined && isTokenHilighted(state, currentSelection, i)) {
        className.push('hilited');
      }
      if (state.ctl.find(cf => cf.pc == i)) className.push('latent');

      if (i == state.cframe.pc) className.push('active');
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
  return `${decl.name} : ${exprToTex(decl.klass)}`;
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

function renderStack(stack: Stack): JSX.Element {
  const newline = "\n";

  const str = stack.map(e => {
    return <span><Tex expr={subToTex(e)} />{newline}</span>;
  });

  return <pre>{str}</pre>;
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
    return <span><Tex expr={e.t + '(' + texOfCtx(e) + ')'} />{newline}</span>;
  });

  return <pre>{str}</pre>;
}

function renderCtlEntry(ctl: CtlEntry, currentSelection: Selection | undefined, dispatch: Dispatch, index?: number): JSX.Element {
  let name: (JSX.Element | string)[] = [''];
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
    {ctl.pc}
  </div>[def: {ctl.defining ? 'T' : 'F'}{name}]</span>;
}

function renderCtl(ctl: Ctl, currentSelection: Selection | undefined, dispatch: Dispatch): JSX.Element {
  const str = ctl.map((ce, index) => renderCtlEntry(ce, currentSelection, dispatch, index));

  return <div className="ctlcontainer">{str}</div>;
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

export function showDupCurrentSelection(state: State, currentSelection: Selection | undefined): JSX.Element | undefined {
  if (currentSelection == undefined)
    return undefined;
  switch (currentSelection.t) {
    case 'sigItem': return renderSigEntry(state.sig[currentSelection.index]);
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
          <b>Ctl</b>:{renderCtl(state.ctl, currentSelection, dispatch)}<br />
        </div>,
        <div style={tdStyle}>
          <b>Sig</b>:{renderSig(state.sig, dispatch, currentSelection)}
        </div>,
        <div style={tdStyle}>
          <b>Stack</b>:{renderStack(state.stack)}
        </div>,
        <div style={tdStyle}>
          <b>Meta</b>:{renderMeta(state.meta)}<br />
        </div>,
      ];

    /* ${stringOfSig(state.sig)}
     *       {white - fg} stack: {
     * /} ${stringOfStack(state.stack)}
     * { white - fg} meta: {
     * /} ${stringOfMeta(state.meta)}
     * `; */
  }

  const dupCurrentSelection = showDupCurrentSelection(state, currentSelection);
  return <div>
    <b>Control</b>: {renderCtlEntry(state.cframe, currentSelection, dispatch)}<br />
    {hsplit(
      renderToks(state, dispatch, currentSelection),
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '100%' }}> {stateRepn}</div>,
      0.20
    )}<br />
    <center>{dupCurrentSelection}</center>
  </div>;
}
