import { produce } from 'immer';

type Expr =
  | { t: 'type' }
  | { t: 'kind' }
  | { t: 'pi', a: Expr, b: Expr }
  | { t: 'appc', cid: string, spine: Expr[] }
  | { t: 'appv', head: string, spine: Expr[] }

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

type Tok =
  | { t: 'type' }
  | { t: '>', name: string | undefined }
  | { t: '(' }
  | { t: ')' }
  | { t: '[' }
  | { t: ']' }
  | { t: '.', name: string | undefined }
  | { t: 'id', name: string }
  ;

type Rng = { first: number, last: number };

type PosTok = { tok: Tok, range: Range };

type SigEntry = {
  name: string,
  klass: Expr,
  range: Rng,
};

type CtxEntry = {
  name: string,
  range: Rng,
};


type MetaCtxEntry =
  | { t: 'sub', sub: Ctx }
  | { t: 'ctx', ctx: Ctx }
  ;

type CtlEntry = {
  pc: number
};


type StackEntry = {
  term: Expr,
  klass: Expr
};

type Sig = SigEntry[];
type Ctx = CtxEntry[];
type MetaCtx = MetaCtxEntry[];
type Ctl = CtlEntry[];
type Stack = StackEntry[];
type Toks = Tok[];

export type State = {
  pc: number,
  sig: Sig,
  ctx: Ctx,
  meta: MetaCtx,
  ctl: Ctl,
  stack: Stack,
  toks: Toks,
  error: string | undefined,
}

export function mkState(toks: Toks): State {
  return {
    pc: 0,
    ctl: [],
    ctx: [],
    meta: [],
    sig: [],
    stack: [],
    toks,
    error: undefined,
  }
}

function stringOfTok(tok: Tok): string {
  switch (tok.t) {
    case 'type': return 'type';
    case '>': return tok.name == undefined ? '>' : `>[${tok.name}]`;
    case '.': return tok.name == undefined ? '.' : `.[${tok.name}]`;
    case 'id': return tok.name;
    case '(': return '(';
    case ')': return ')';
    case '[': return '[';
    case ']': return ']';
  }
}

function stringOfToks(state: State): string {
  return state.toks.map(stringOfTok).map((x, i) => i == state.pc ? `{#0fffff-bg}${x}{/}` : x).join(' ');
}

function stringOfSig(sig: Sig): string {
  return sig.map(e => {
    return `${e.name} : ${exprToString(e.klass)}`;
  }).join(', ');
}

function stringOfStack(stack: Stack): string {
  return stack.map(e => {
    return `${exprToString(e.term)} : ${exprToString(e.klass)}`;
  }).join(', ');
}

export function stringOfState(state: State): string {
  let stateRepn: string;
  if (state.error != undefined) {
    stateRepn = `{bold}{red-fg}ERROR: ${state.error}{/}`;
  }
  else {
    stateRepn = `{white-fg}sig:{/} ${stringOfSig(state.sig)}
{white-fg}stack:{/} ${stringOfStack(state.stack)}
`;
  }
  return `${stringOfToks(state)}\n${stateRepn}`;
}

export function parse(input: string): Tok[] {
  const toks = input.split(/\n/)
    .map(x => x.replace(/#.*/g, ''))
    .flatMap(x => x.split(/\s+/))
    .filter(x => x.length != 0);
  const out: Tok[] = [];
  let name: string | undefined = undefined;
  for (let i = 0; i < toks.length; i++) {
    switch (toks[i]) {
      case 'type': out.push({ t: 'type' }); break;
      case '(': out.push({ t: '(' }); break;
      case ')': out.push({ t: ')' }); break;
      case '[': out.push({ t: '[' }); break;
      case ']': out.push({ t: ']' }); break;
      case ':': name = toks[++i]; break;
      case '>': out.push({ t: '>', name }); name = undefined; break;
      case '.': out.push({ t: '.', name }); name = undefined; break;
      case ']': out.push({ t: ']' }); break;
      default:
        out.push({ t: 'id', name: toks[i] });
    }
  }
  return out;
}

function popStack(state: State): undefined | { elt: StackEntry, newState: State } {
  if (state.stack.length == 0)
    return undefined;
  const elt = state.stack.at(-1)!;
  const newState = produce(state, s => {
    s.stack.pop();
  });
  return { elt, newState };
}

function execInstruction(state: State, inst: Tok): State {
  switch (inst.t) {
    case 'type': return produce(state, s => {
      s.stack.push({ term: { t: 'type' }, klass: { t: 'kind' } });
    });

    case '.': {
      const popResult = popStack(state);
      if (popResult == undefined)
        return produce(state, s => { s.error = `stack underflow during .`; });
      const { elt, newState } = popResult;
      if (elt.klass.t != 'type' && elt.klass.t != 'kind') {
        return produce(state, s => { s.error = `expected classifier on stack during .`; });
      }
      return produce(newState, s => {
        s.sig.push({
          name: inst.name ?? '_',
          range: { first: 0, last: 1 },
          klass: elt.term,
        });
      });
    }

    default: return produce(state, s => {
      s.error = `unimplemented instruction ${inst.t}`;
    });
  }
}

export function stepForward(state: State): State | undefined {
  if (state.error)
    return undefined;
  state = execInstruction(state, state.toks[state.pc]);
  state = produce(state, s => { s.pc++; });
  if (state.pc >= state.toks.length) return undefined;
  return state;
}

export function run(state: State): State[] {
  const states: State[] = [];
  for (let i = 0; i < 100; i++) {
    states.push(state);
    const next = stepForward(state);
    if (next == undefined)
      break;
    state = next;
  }
  return states;
}
