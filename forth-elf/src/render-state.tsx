import { tokenToString } from "typescript";
import { CtxEntry, Expr, MetaCtx, MetaCtxEntry, Sig, Stack, State, Tok } from "./state-types";
import { Dispatch } from "./state-types";
import Tex from './katex';
import { CSSProperties } from "react";
import { Rng, in_range } from "./range";

function stringOfTok(tok: Tok): string {
  switch (tok.t) {
    case 'type': return 'type';
    case '->': return tok.name == undefined ? '->' : `: ${tok.name} ->`;
    case '.': return tok.name == undefined ? '.' : `: ${tok.name} .`;
    case 'id': return tok.name;
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

function renderToks(state: State, dispatch: Dispatch, currentRange: Rng | undefined): JSX.Element {
  let i = 0;
  function setStep(i: number): (e: React.MouseEvent) => void {
    return e => dispatch({ t: 'setStep', frame: i });
  }
  const row: JSX.Element[] = [];
  for (const decl of state.origToks) {
    for (const tok of decl) {
      const className = ['token'];
      if (currentRange != undefined && in_range(i, currentRange)) {
        console.log(i);
        className.push('hilited');
      }
      if (i == state.pc) className.push('active');
      if (i < state.pc) className.push('executed');
      const str = stringOfTok(tok);
      const elt = <div className={className.join(' ')} onMouseDown={setStep(i)}>{str}</div>;
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

function renderSig(sig: Sig, dispatch: Dispatch): JSX.Element {
  const newline = "\n";

  const str = sig.map(sigent => {
    return <div className="sigbutton" onMouseDown={e => { dispatch({ t: 'setCurrentRange', range: sigent.program }) }}>
      <Tex expr={declToTex(sigent) + '.'} />{newline}
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

function texOfSubEntry(e: CtxEntry): string {
  return `${e.name ?? '\\_'}:${exprToTex(e.klass)}`;
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
    return <span><Tex expr={'(' + texOfCtx(e) + ')'} />{newline}</span>;
  });

  return <pre>{str}</pre>;
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

export function renderState(state: State, dispatch: Dispatch, currentRange: Rng | undefined): JSX.Element {
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
          <b>Sig</b>:{renderSig(state.sig, dispatch)}
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
  return hsplit(
    renderToks(state, dispatch, currentRange),
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '100%' }}> {stateRepn}</div>,
    0.20
  );
}
