import { CtxEntry, Expr, MetaCtx, MetaCtxEntry, Sig, Stack, State, Tok } from "./state";

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
    case 'pi': return `Pi {_:${exprToString(e.a)}} ${exprToString(e.b)}`;
    case 'appc': return appToSpine(e.cid, e.spine);
    case 'appv': return appToSpine(e.head, e.spine);
  }
}

function stringOfToks(state: State): string {
  return state.toks.map(stringOfTok).map((x, i) => i == state.pc ? `{#0fffff-bg}${x}{/}` : x).join(' ');
}

function stringOfSig(sig: Sig): string {
  return sig.map(e => {
    return `${e.name} : ${exprToString(e.klass)}`;
  }).join('\n');
}

function stringOfStack(stack: Stack): string {
  return stack.map(e => {
    return `${exprToString(e.term)} : ${exprToString(e.klass)}`;
  }).join(', ');
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

function stringOfMeta(meta: MetaCtx): string {
  return meta.map(e => {
    return `(${stringOfCtx(e)})`;
  }).join(', ');
}

export function renderState(state: State): JSX.Element {
  let stateRepn: string;
  if (state.error != undefined) {
    stateRepn = `{bold}{red-fg}ERROR: ${state.error}{/}`;
  }
  else {
    stateRepn = `{white-fg}sig:{/}
${stringOfSig(state.sig)}
{white-fg}stack:{/} ${stringOfStack(state.stack)}
{white-fg}meta:{/} ${stringOfMeta(state.meta)}
`;
  }
  return <pre>${stringOfToks(state)}
    ${stateRepn} </pre>;
}
