import { produce } from 'immer';

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
  range: Range,
};

type CtxEntry = {
  name: string,
  range: Range,
};


type MetaCtxEntry =
  | { t: 'sub', sub: Ctx }
  | { t: 'ctx', ctx: Ctx }
  ;

type CtlEntry = {
  pc: number
};


type StackEntry = {

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

export function stringOfState(state: State): string {
  return `${stringOfToks(state)}
{bold}sig{/bold}:
{bold}stack{/bold}: foo
`
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

export function stepForward(state: State): State | undefined {
  const state2 = produce(state, s => { s.pc++; });
  if (state2.pc >= state2.toks.length) return undefined;
  return state2;
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
