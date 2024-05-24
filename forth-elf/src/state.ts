import { produce } from 'immer';
import { Sub, CtlEntry, Ctx, Expr, MetaCtxEntry, StackEntry, State, Tok, Toks } from './state-types';
import { Rng } from "./range";
import { tokenToString } from 'typescript';
import { stringOfTok } from './render-state';

const ITERATIONS_LIMIT = 1000;

export function mkState(toks: Tok[][]): State {
  return {
    cframe: {
      pc: 0,
      program: { first: 0, last: 0 },
      defining: true,
      readingName: false,
      name: undefined,
    },
    ctl: [],
    ctx: [],
    meta: [{
      t: 'ctx',
      ctx: [],

      // XXX this context is a stub that stands in for the signature, which is why pc is a dummy value for now.
      // should eventually delete it and merge the implementation of . with →, I guess?
      pc: -1,
    }],
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

function formPi(ctx: Ctx, base: StackEntry): StackEntry {
  let term = base.term;
  for (let i = ctx.length - 1; i >= 0; i--) {
    term = { t: 'pi', name: ctx[i].name, a: ctx[i].klass, b: term };
  }
  return { term, klass: base.klass };
}

function formRoot(name: string, sub: Sub, base: StackEntry): StackEntry {
  return {
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

function callIdent(state: State, name: string): State {

  const sigma: MetaCtxEntry = {
    t: 'sub',
    sub: [],
  };

  state = produce(state, s => {
    s.meta.push(sigma);
  });

  const sigent = state.sig.find(se => se.name == name);
  if (sigent == undefined) {
    throw new Step(`couldn't find ${name}`);
  }
  return produce(state, s => {
    s.ctl.push(state.cframe);
    s.cframe.pc = sigent.program.first - 1; // because we'll increment it later
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
  let stackEntry;
  ({ elt: stackEntry, newState: state } = popStack(state));

  if (stackEntry.klass.t != 'type' && stackEntry.klass.t != 'kind')
    throw new Step(`expected classifier on stack during .`);

  let metaEntry;
  ({ elt: metaEntry, newState: state } = popMeta(state));

  if (metaEntry.t != 'ctx')
    throw new Step(`expected ctx during >`);

  const newStackEntry: StackEntry = formPi(metaEntry.ctx, stackEntry);

  return produce(state, s => {
    s.cframe.program.last = pc;
    s.stack.push(newStackEntry);
  });
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
      s.cframe.program.last = pc;
      s.stack.push({ term: { t: 'type' }, klass: { t: 'kind' } });
    });

    case '.': {
      if (state.cframe.defining) {
        state = doCloseParen(state, pc);

        let elt;
        ({ elt, newState: state } = popStack(state));

        if (elt.klass.t != 'type' && elt.klass.t != 'kind') {
          throw new Step(`expected classifier on stack during .`);
        }

        const emptyProgram: Tok[] = [];
        state = produce(state, s => {
          s.sig.push({
            name: state.cframe.name ?? '_',
            klass: elt.term,
            program: state.cframe.program,
          });
          s.cframe.program = { first: pc + 1, last: pc };
          s.cframe.name = undefined;
        });
        state = doOpenParen(state);
        return state;
      }
      else {
        let cframe;
        ({ elt: cframe, newState: state } = popCtl(state));

        let sframe;
        ({ elt: sframe, newState: state } = popStack(state));

        let mframe;
        ({ elt: mframe, newState: state } = popMeta(state));

        const name = state.cframe.name;
        if (name == undefined) {
          throw new Step(`expected constant to be named during :`);
        }

        if (mframe.t != 'sub') {
          throw new Step(`expected sub during .`);
        }

        return produce(state, s => {
          s.cframe = cframe;
          s.stack.push(formRoot(name, mframe.sub, sframe));
        });
      }
    }

    case 'id': {
      switch (inst.name) {
        case 'o': // fallthrough intentional
        case 'l': // fallthrough intentional
        case 's': // fallthrough intentional
        case 'b': // fallthrough intentional
        case 'k':
          return callIdent(state, inst.name);

        case 'x': // fallthrough intentional
        case 'y':
          return produce(state, s => {
            s.cframe.program.last = pc;
            s.stack.push({
              term: { t: 'appv', head: inst.name, spine: [] },
              klass: { t: 'appc', cid: 'o', spine: [] },
            });
          });

        default: throw new Step(`unimplemented identifier ${inst.name}`);
      }
    }

    case '->': {
      if (state.cframe.defining) {

        if (state.meta.length == 0)
          throw new Step(`metacontext underflow during ->`);
        const oldCtx = state.meta[state.meta.length - 1];
        if (oldCtx.t != 'ctx')
          throw new Step(`expected ctx during ->`);

        let elt;
        ({ elt, newState: state } = popStack(state));

        // XXX state.cframe.name is slightly suspect here
        const newCtx = produce(oldCtx, c => {
          c.ctx.push({ name: state.cframe.name, klass: elt.term, range: { first: 0, last: 1 } });
        });

        return produce(state, s => {
          s.cframe.name = undefined;
          s.meta[state.meta.length - 1] = newCtx;
        });
      }
      else {
        let elt1;
        ({ elt: elt1, newState: state } = popStack(state));

        let elt2;
        ({ elt: elt2, newState: state } = popStack(state));

        if (!exprEqual(elt1.term, elt2.klass)) {
          throw new Step(`type mismatch`);
        }

        if (state.meta.length == 0)
          throw new Step(`metacontext underflow during ->`);

        const oldSub = state.meta[state.meta.length - 1];
        if (oldSub.t != 'sub')
          throw new Step(`expected sub during ->`);

        const newSub = produce(oldSub, c => {
          c.sub.push({ term: elt2.term, name: state.cframe.name, klass: elt1.term, range: { first: 0, last: 1 } });
        });
        return produce(state, s => {
          s.cframe.name = undefined;
          s.meta[state.meta.length - 1] = newSub;
        });
      }
    }

    case '(': return doOpenParen(state);
    case ')': return doCloseParen(state, pc);

    case ':': {
      return produce(state, s => {
        s.cframe.readingName = true;
      });
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
