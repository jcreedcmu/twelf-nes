import { tokenToString } from "typescript";
import { Action, Ctl, CtlEntry, CtxEntry, Expr, MetaCtx, MetaCtxCtxEntry, MetaCtxEntry, MetaCtxSubEntry, Selection, Sig, SigEntry, Stack, StackEntry, State, SubEntry, Tok } from "./state-types";
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
    case 'EOF': return 'EOF';
  }
}

function appToSpineTex(head: string, spine: Expr[]): string {
  if (spine.length == 0)
    return head;
  else
    return `${head}\\cdot(${spine.map(exprToTex).join(",")})`;
}

function exprToTex(e: Expr): string {
  const blank = '\\_';
  switch (e.t) {
    case 'type': return '\\mathsf{type}';
    case 'kind': return '\\mathsf{kind}';
    case 'pi': return e.name == undefined ? `(${exprToTex(e.a)} \\to ${exprToTex(e.b)})`
      : `\\left( \\prod_{ ${e.name} {:} ${exprToTex(e.a)}}  ${exprToTex(e.b)} \\right)`;
    case 'lam': return `(\\lambda ${e.name ?? blank} : ${exprToTex(e.a)} . ${exprToTex(e.m)})`;
    case 'appc': return appToSpineTex(e.cid, e.spine);
    case 'appv': return appToSpineTex(e.head, e.spine);
  }
}



function renderToks(state: State, dispatch: Dispatch, currentPcSelection: number | undefined): JSX.Element {
  let i = 0;
  function findPc(pc: number): (e: React.MouseEvent) => void {
    return e => dispatch({ t: 'findPc', pc });
  }
  const row: JSX.Element[] = [];
  for (const decl of state.origToks) {
    for (const tok of decl) {
      const className = ['token'];
      if (currentPcSelection == i) {
        className.push('hilited');
      }
      if (state.ctl.find(cf => cf.pc == i)) className.push('latent');

      if (i == state.cframe.pc) className.push('active');
      const str = stringOfTok(tok);
      const elt = <div className={className.join(' ')} onMouseDown={findPc(i)}>{str}</div>;
      row.push(elt);
      i++;
    }
    row.push(<hr style={{ height: 1, border: 'none', backgroundColor: 'black' }} />);
  }
  return <div>{row}</div>;
}

function declToTex(decl: { name: string, klass: Expr }): string {
  return `${decl.name} : ${exprToTex(decl.klass)} `;
}

function subToTex(decl: { term: Expr, klass: Expr }): string {
  return `${exprToTex(decl.term)} : ${exprToTex(decl.klass)} `;
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

function renderStack(stack: Stack, dispatch: Dispatch, currentPcSelection: number | undefined): JSX.Element {
  const newline = "\n";

  function renderStackFrame(e: StackEntry) {
    switch (e.t) {
      case 'DataFrame': return <span><Tex expr={subToTex(e)} />{newline}</span>;
      case 'LabDataFrame': return <span><Tex expr={subToTex(e)} /> {e.name}
        <PcToken dispatch={dispatch} pc={e.pc} selection={currentPcSelection} />{newline}</span>;
    }
  }
  const str = stack.map(e => renderStackFrame(e));

  return <pre>{str}</pre>;
}

function texOfSubEntry(e: SubEntry): string {
  return `[${exprToTex(e.term)} /${e.name ?? '\\_'}]:${exprToTex(e.klass)}`;
}

function texOfCtxEntry(e: CtxEntry): string {
  return `${e.name ?? '\\_'}:${exprToTex(e.klass)}`;
}

function texOfCtx(meta: MetaCtxEntry): string {
  switch (meta.t) {
    case 'sub': return meta.sub.map(e => texOfSubEntry(e)).join(', ');
    case 'ctx': return meta.ctx.map(texOfCtxEntry).join(', ');
  }
}

function renderCtx(e: MetaCtxCtxEntry, full?: boolean) {
  const ctxItems: JSX.Element[] = [];
  for (const ci of e.ctx) {
    ctxItems.push(<div className="token"><Tex expr={texOfCtxEntry(ci)} /></div>);
  }
  return ctxItems;
}

function renderSub(e: MetaCtxSubEntry, full?: boolean) {
  const ctxItems: JSX.Element[] = [];
  for (const ci of e.sub) {
    ctxItems.push(<span><div className="token"><Tex expr={texOfSubEntry(ci)} /></div><div className="token">{e.pc}</div></span>);
  }
  return ctxItems;
}

type MetaButtonProps = {
  dispatch: Dispatch;
  index: number;
}

function MetaButton(props: MetaButtonProps): JSX.Element {
  const { dispatch, index } = props;
  return <button onMouseDown={(e) => {
    dispatch({ t: 'setCurrentSel', sel: { t: 'metaItem', index } })
  }}>?</button>;
}

function renderMetaFrame(e: MetaCtxEntry, dispatch: Dispatch, currentPcSelection: number | undefined, full?: boolean): JSX.Element {
  const lb = '\\{';
  const rb = '\\}';
  switch (e.t) {
    case 'sub': {
      return <span>{renderSub(e, full)}</span>;
    }
    case 'ctx': {
      const onClick = () => {
        dispatch({ t: 'setCurrentPcSel', pc: e.pc });
      }
      const selected = currentPcSelection == e.pc;
      const token = <PcToken dispatch={dispatch} selection={currentPcSelection} pc={e.pc} />;
      return <span>{renderCtx(e, full)}{token}</span>;
    }
  }
}

function renderMeta(meta: MetaCtx, currentPcSelection: number | undefined, dispatch: Dispatch): JSX.Element {
  const newline = "\n";
  const str = meta.map((e, i) => <span>
    <MetaButton dispatch={dispatch} index={i} />
    {renderMetaFrame(e, dispatch, currentPcSelection)}
    {newline}
  </span>);
  return <pre>{str}</pre>;
}

type PcTokenProps = {
  dispatch: Dispatch,
  selection: number | undefined,
  pc: number,
}

function PcToken(props: PcTokenProps): JSX.Element {
  const { dispatch, pc, selection } = props;
  const className: string[] = ["token"];
  if (selection == pc)
    className.push('hilited');
  const onMouseDown = (e: React.MouseEvent) => {
    dispatch({ t: 'setCurrentPcSel', pc })
  }
  return <div className={className.join(' ')} onMouseDown={onMouseDown} >{pc}</div>;
}

function renderCtlEntry(ctl: CtlEntry, currentPcSelection: number | undefined, dispatch: Dispatch, index?: number): JSX.Element {
  let name: (JSX.Element | string)[] = [''];
  if (ctl.readingName) {
    name = [`, name: `, <span style={{ color: 'red' }}>?</span>];
  }
  else if (ctl.name != undefined) {
    name = [`, name: ${ctl.name}`];
  }

  const onMouseDown = index == undefined ? undefined : () => {
    dispatch({ t: 'setCurrentPcSel', pc: ctl.pc });
  };

  return <span>
    <PcToken dispatch={dispatch} pc={ctl.pc} selection={currentPcSelection} />
    [{name}]</span>;
}

function renderCtl(ctl: Ctl, currentPcSelection: number | undefined, dispatch: Dispatch): JSX.Element {
  const str = ctl.map((ce, index) => renderCtlEntry(ce, currentPcSelection, dispatch, index));

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

export function showDupCurrentSelection(state: State, dispatch: Dispatch, currentSelection: Selection | undefined, currentPcSelection: number | undefined): JSX.Element | undefined {
  if (currentSelection == undefined)
    return undefined;
  switch (currentSelection.t) {

    case 'sigItem': {
      const sigEntry = state.sig[currentSelection.index];
      return <div>
        {renderSigEntry(sigEntry)}<br />
        <PcToken dispatch={dispatch} pc={sigEntry.pc} selection={currentPcSelection} />
      </div>;
    }
    case 'metaItem': {
      const metaEntry = state.meta[currentSelection.index];
      return <div>
        {renderMetaFrame(metaEntry, dispatch, currentPcSelection, true)}<br />
      </div>;

    }
  }
}

export function renderState(state: State, dispatch: Dispatch, currentSelection: Selection | undefined, currentPcSelection: number | undefined): JSX.Element {
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
          <b>Ctl</b>:{renderCtl(state.ctl, currentPcSelection, dispatch)}<br />
        </div>,
        <div style={tdStyle}>
          <b>Sig</b>:{renderSig(state.sig, dispatch, currentSelection)}
        </div>,
        <div style={tdStyle}>
          <b>Stack</b>:{renderStack(state.stack, dispatch, currentPcSelection)}
        </div>,
        <div style={tdStyle}>
          <b>Meta</b>:{renderMeta(state.meta, currentPcSelection, dispatch)}<br />
        </div>,
      ];

    /* ${stringOfSig(state.sig)}
     *       {white - fg} stack: {
     * /} ${stringOfStack(state.stack)}
     * { white - fg} meta: {
     * /} ${stringOfMeta(state.meta)}
     * `; */
  }

  const dupCurrentSelection = showDupCurrentSelection(state, dispatch, currentSelection, currentPcSelection);
  return <div>
    <b>Control</b>: {renderCtlEntry(state.cframe, currentPcSelection, dispatch)}<br />
    {hsplit(
      renderToks(state, dispatch, currentPcSelection),
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '100%' }}> {stateRepn}</div>,
      0.20
    )}<br />
    <center>{dupCurrentSelection}</center>
  </div>;
}
