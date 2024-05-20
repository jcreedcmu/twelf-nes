import { tokenToString } from "typescript";
import { CtxEntry, Expr, MetaCtx, MetaCtxEntry, Sig, Stack, State, Tok } from "./state-types";
import { Dispatch } from "./state-types";
import Tex from './katex';

function stringOfTok(tok: Tok): string {
  switch (tok.t) {
    case 'type': return 'type';
    case '>': return tok.name == undefined ? '>' : `: ${tok.name} >`;
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

function renderToks(state: State, dispatch: Dispatch): JSX.Element {
  let i = 0;
  function setStep(i: number): (e: React.MouseEvent) => void {
    return e => dispatch({ t: 'setStep', frame: i });
  }

  const row: JSX.Element[] = [];
  for (const decl of state.origToks) {
    for (const tok of decl) {
      const className = ['token'];
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

function renderSig(sig: Sig): JSX.Element {
  const newline = "\n";
  const str = sig.map(e => {
    return <span><Tex expr={e.name} /> : {exprToString(e.klass)}.{newline}</span>;
  });
  return <pre>{str}</pre>;
}

function renderStack(stack: Stack): JSX.Element {
  const str = stack.map(e => {
    return `${exprToString(e.term)} : ${exprToString(e.klass)}`;
  }).join(', ');
  return <pre>{str}</pre>;
}

function stringOfSubEntry(e: CtxEntry): string {
  return `${e.name ?? '_'}:${exprToString(e.klass)}`;
}

function stringOfCtxEntry(e: CtxEntry): string {
  return `${e.name ?? '_'}:${exprToString(e.klass)}`;
}

function stringOfCtx(meta: MetaCtxEntry): string {
  switch (meta.t) {
    case 'sub': return meta.sub.map(stringOfSubEntry).join(', ');
    case 'ctx': return meta.ctx.map(stringOfCtxEntry).join(', ');
  }
}

function renderMeta(meta: MetaCtx): JSX.Element {
  const str = meta.map(e => {
    return `(${stringOfCtx(e)})`;
  }).join(', ');
  return <pre>{str}</pre>;
}

export function renderState(state: State, dispatch: Dispatch): JSX.Element {
  let stateRepn: JSX.Element;
  if (state.error != undefined) {
    stateRepn = <span style={{ color: 'red' }}>ERROR: {state.error}</span>;
  }
  else {
    stateRepn = <div>
      <b>Sig</b>:{renderSig(state.sig)}<br />
      <b>Stack</b>:{renderStack(state.stack)}<br />
      <b>Meta</b>:{renderMeta(state.meta)}<br />
    </div>;

    /* ${stringOfSig(state.sig)}
     *       {white - fg} stack: {
     * /} ${stringOfStack(state.stack)}
     * { white - fg} meta: {
     * /} ${stringOfMeta(state.meta)}
     * `; */
  }
  return <div>{renderToks(state, dispatch)}
    {stateRepn} </div>;
}
