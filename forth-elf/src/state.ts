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
  name: string | undefined,
  klass: Expr,
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
    case '>': return tok.name == undefined ? '>' : `: ${tok.name} >`;
    case '.': return tok.name == undefined ? '.' : `: ${tok.name} .`;
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

export function stringOfState(state: State): string {
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

function popMeta(state: State): undefined | { elt: MetaCtxEntry, newState: State } {
  if (state.meta.length == 0)
    return undefined;
  const elt = state.meta.at(-1)!;
  const newState = produce(state, s => {
    s.meta.pop();
  });
  return { elt, newState };
}

function formPi(ctx: Ctx, base: StackEntry): StackEntry {
  let term = base.term;
  for (let i = 0; i < ctx.length; i++) {
    term = { t: 'pi', a: ctx[i].klass, b: term };
  }
  return { term, klass: base.klass };
}

// XXX Probably should just do legitimate equality checking
function flatten(e: Expr): string[] {
  switch (e.t) {
    case 'type': return ['type'];
    case 'kind': return ['kind'];
    case 'pi': throw new Error(`Didn't expect to flatten anything but base types!`);
    case 'appc': {
      const spine: string[] = e.spine.map(x => flatten(x)).reverse().flatMap(x => x);
      return [...spine, e.cid];
    }
    case 'appv': {
      const spine: string[] = e.spine.map(x => flatten(x)).reverse().flatMap(x => x);
      return [...spine, e.head];
    }
  }
}

function exprEqual(e1: Expr, e2: Expr) {
  const f1 = flatten(e1).join(" ");
  const f2 = flatten(e2).join(" ");
  return f1 == f2;
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

    case 'id': {
      switch (inst.name) {
        case 'o':
          return produce(state, s => {
            s.stack.push({
              term: { t: 'appc', cid: 'o', spine: [] },
              klass: { t: 'type' }
            });
          });

        case 'l':
          return produce(state, s => {
            s.stack.push({
              term: { t: 'appc', cid: 'l', spine: [] },
              klass: { t: 'appc', cid: 'o', spine: [] },
            });
          });

        case 'k':
          return produce(state, s => {
            s.stack.push({
              term: { t: 'appc', cid: 'k', spine: [] },
              klass: { t: 'appc', cid: 'o', spine: [] },
            });
          });

        case 's': {
          const popResult = popStack(state);
          if (popResult == undefined)
            return produce(state, s => { s.error = `stack underflow during s`; });
          const { elt, newState } = popResult;
          if (!exprEqual(elt.klass, { t: 'appc', cid: 'o', spine: [] })) {
            return produce(state, s => { s.error = `type mismatch during s`; });
          }
          return produce(newState, s => {
            s.stack.push({
              term: { t: 'appc', cid: 's', spine: [elt.term] },
              klass: { t: 'type' }
            });
          });
        }

        default: return produce(state, s => {
          s.error = `unimplemented identifier ${inst.name}`;
        });
      }
    }

    case '>': {
      const popResult = popStack(state);
      if (popResult == undefined)
        return produce(state, s => { s.error = `stack underflow during >`; });
      const { elt, newState } = popResult;
      if (state.meta.length == 0)
        return produce(state, s => { s.error = `metacontext underflow during >`; });
      const oldCtx = state.meta[state.meta.length - 1];
      if (oldCtx.t != 'ctx')
        return produce(state, s => { s.error = `expected ctx during >`; });
      const newCtx = produce(oldCtx, c => {
        c.ctx.push({ name: inst.name, klass: elt.term, range: { first: 0, last: 1 } });
      });
      return produce(newState, s => {
        s.meta[state.meta.length - 1] = newCtx;
      });
    }

    case '(': {
      const gamma: MetaCtxEntry = {
        t: 'ctx',
        ctx: [],
      };

      return produce(state, s => {
        s.meta.push(gamma);
      });
    }

    case ')': {
      const pr1 = popStack(state);
      if (pr1 == undefined)
        return produce(state, s => { s.error = `stack underflow during )`; });
      const { elt: stackEntry, newState: state1 } = pr1;

      if (stackEntry.klass.t != 'type' && stackEntry.klass.t != 'kind') {
        return produce(state, s => { s.error = `expected classifier on stack during .`; });
      }

      const pr2 = popMeta(state1);
      if (pr2 == undefined)
        return produce(state1, s => { s.error = `metacontext underflow during )`; });
      const { elt: metaEntry, newState: state2 } = pr2;

      if (metaEntry.t != 'ctx')
        return produce(state, s => { s.error = `expected ctx during >`; });

      const newStackEntry: StackEntry = formPi(metaEntry.ctx, stackEntry);

      return produce(state2, s => {
        s.stack.push(newStackEntry);
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
