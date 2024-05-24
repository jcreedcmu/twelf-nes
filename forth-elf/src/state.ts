import { produce } from 'immer';
import { Sub, CtlEntry, Ctx, Expr, MetaCtxEntry, StackEntry, State, Tok, Toks, SigEntry } from './state-types';
import { Rng } from "./range";
import { tokenToString } from 'typescript';
import { stringOfTok } from './render-state';

const ITERATIONS_LIMIT = 1000;

export function mkState(toks: Tok[][]): State {
  return {
    cframe: {
      pc: 0,
      defining: true,
      readingName: false,
      name: undefined,
    },
    ctl: [],
    ctx: [],
    meta: [],
    sig: [],
    stack: [],
    toks: toks.flatMap(x => x),
    origToks: toks,
    error: undefined,
  }
}

function popStack(state: State): { elt: StackEntry, newState: State } {
  if (state.stack.length == 0)
    throw new Step(`stack underflow`);
  const elt = state.stack.at(-1)!;
  const newState = produce(state, s => {
    s.stack.pop();
  });
  return { elt, newState };
}

function popCtl(state: State): { elt: CtlEntry, newState: State } {
  if (state.ctl.length == 0)
    throw new Step(`ctl underflow`);
  const elt = state.ctl.at(-1)!;
  const newState = produce(state, s => {
    s.ctl.pop();
  });
  return { elt, newState };
}

function popMeta(state: State): { elt: MetaCtxEntry, newState: State } {
  if (state.meta.length == 0)
    throw new Step(`metacontext underflow`);
  const elt = state.meta.at(-1)!;
  const newState = produce(state, s => {
    s.meta.pop();
  });
  return { elt, newState };
}

function formPi(ctx: Ctx, base: StackEntry, name: string | undefined, pc: number): StackEntry {
  let term = base.term;
  for (let i = ctx.length - 1; i >= 0; i--) {
    term = { t: 'pi', name: ctx[i].name, a: ctx[i].klass, b: term };
  }
  return { t: 'LabDataFrame', term, klass: base.klass, name, pc };
}

function formRoot(name: string, sub: Sub, base: StackEntry): StackEntry {
  return {
    t: 'DataFrame',
    term: { t: 'appc', cid: name, spine: sub.map(x => x.term) },
    klass: base.term
  };
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

class Step extends Error {
  constructor(public msg: string) { super(); }
}

function errorState(state: State, msg: string): State {
  return produce(state, s => { s.error = msg; });
}

function findIdent(state: State, name: string): SigEntry {
  // XXX wrong direction?
  const sigent = state.sig.find(se => se.name == name);

  if (sigent != undefined) {
    return sigent;
  }

  for (let i = state.meta.length - 1; i >= 0; i--) {
    const frame = state.meta[i];
    // XXX should search sub?
    if (frame.t == 'ctx') {
      // XXX wrong direction?
      const found = frame.ctx.findIndex(e => e.name == name)
      if (found != -1) {
        return {
          name,
          klass: frame.ctx[found].klass,
          pc: frame.ctx[found].pc,
        }
      }
    }
  }

  throw new Step(`couldn't find ${name}`);
}

function callIdent(state: State, name: string): State {

  const sigma: MetaCtxEntry = {
    t: 'sub',
    sub: [],
  };

  state = produce(state, s => {
    s.meta.push(sigma);
  });

  const result = findIdent(state, name);

  return produce(state, s => {
    s.ctl.push(state.cframe);
    s.cframe.pc = result.pc;
    s.cframe.defining = false;
  });
}

function doOpenParen(state: State) {
  const gamma: MetaCtxEntry = {
    t: 'ctx',
    ctx: [],
    pc: state.cframe.pc,
  };

  return produce(state, s => {
    s.meta.push(gamma);
  });
}

function doCloseParen(state: State, pc: number): State {
  let metaEntry;
  ({ elt: metaEntry, newState: state } = popMeta(state));

  switch (metaEntry.t) {
    case 'ctx': {
      let stackEntry;
      ({ elt: stackEntry, newState: state } = popStack(state));

      if (stackEntry.klass.t != 'type' && stackEntry.klass.t != 'kind')
        throw new Step(`expected classifier on stack during .`);

      const newStackEntry: StackEntry = formPi(metaEntry.ctx, stackEntry, state.cframe.name, metaEntry.pc);

      return produce(state, s => {
        s.cframe.name = undefined;
        s.stack.push(newStackEntry);
      });
    }
    case 'sub': {
      let cframe;
      ({ elt: cframe, newState: state } = popCtl(state));

      let sframe;
      ({ elt: sframe, newState: state } = popStack(state));

      // XXX assert sframe is type/kind?

      const name = state.cframe.name;
      if (name == undefined) {
        throw new Step(`expected constant to be named during closeParen`);
      }

      return produce(state, s => {
        s.cframe.name = undefined;
        s.cframe = cframe;
        s.stack.push(formRoot(name, metaEntry.sub, sframe));
      });
    }
  }
}

function doBind(state: State, pc: number): State {

  if (state.meta.length == 0) { // signature
    let elt;
    ({ elt, newState: state } = popStack(state));

    if (elt.t != 'LabDataFrame')
      throw new Step(`expected labelled data frame on stack during .`);

    if (elt.klass.t != 'type' && elt.klass.t != 'kind')
      throw new Step(`expected classifier on stack during .`);

    const emptyProgram: Tok[] = [];
    state = produce(state, s => {
      s.sig.push({
        name: elt.name ?? '_',
        klass: elt.term,
        pc: elt.pc,
      });
    });

    return state;
  }

  const oldCtx = state.meta[state.meta.length - 1];
  switch (oldCtx.t) {
    case 'ctx': {
      let elt;
      ({ elt, newState: state } = popStack(state));

      if (elt.t != 'LabDataFrame')
        throw new Step(`expected labelled data frame on stack during .`);

      const newCtx = produce(oldCtx, c => {
        c.ctx.push({
          name: elt.name,
          klass: elt.term,
          pc: elt.pc,
        });
      });

      return produce(state, s => {
        s.meta[state.meta.length - 1] = newCtx;
      });
    }
    case 'sub': {
      let elt1; // A : type
      ({ elt: elt1, newState: state } = popStack(state));

      let elt2; // M : A
      ({ elt: elt2, newState: state } = popStack(state));

      if (!exprEqual(elt1.term, elt2.klass)) {
        throw new Step(`type mismatch`);
      }

      const sub = produce(oldCtx.sub, c => {
        c.push({
          term: elt2.term, name: state.cframe.name, klass: elt1.term,
          pc: -1, // XXX this is wrong
        });
      });
      return produce(state, s => {
        s.cframe.name = undefined;
        s.meta[state.meta.length - 1] = { t: 'sub', sub };
      });
    }
  }
}

function execInstruction(state: State, inst: Tok, pc: number): State {
  if (state.cframe.readingName) {
    return produce(state, s => {
      s.cframe.name = stringOfTok(inst);
      s.cframe.readingName = false;
    });
  }

  switch (inst.t) {
    case 'type': return produce(state, s => {
      s.stack.push({ t: 'DataFrame', term: { t: 'type' }, klass: { t: 'kind' } });
    });

    // These are now the same
    case '.': return doBind(state, pc);
    case '->': return doBind(state, pc);
    case 'id': return callIdent(state, inst.name);
    case '(': return doOpenParen(state);
    case ')': return doCloseParen(state, pc);

    case ':': {
      return produce(state, s => {
        s.cframe.readingName = true;
      });
    }
    case 'EOF': {
      throw new Step(`halt`);
    }
    default: throw new Step(`unimplemented instruction ${inst.t}`);
  }
}


export function stepForward(state: State): State | undefined {
  if (state.error)
    return undefined;
  try {
    state = execInstruction(state, state.toks[state.cframe.pc], state.cframe.pc);
    state = produce(state, s => { s.cframe.pc++; });
    if (state.cframe.pc >= state.toks.length) return undefined;
  }
  catch (e) {
    if (e instanceof Step) {
      return errorState(state, e.msg);
    }
  }
  return state;
}

export function run(state: State): State[] {
  const states: State[] = [];
  for (let i = 0; i < ITERATIONS_LIMIT; i++) {
    states.push(state);
    const next = stepForward(state);
    if (next == undefined)
      break;
    state = next;
  }
  return states;
}

export function getCtlDepth(state: State): number {
  return state.ctl.length;
}
