import { produce } from 'immer';
import { CtlEntry, Ctx, Expr, MetaCtxEntry, StackEntry, State, Tok, Toks } from './state-types';
import { Rng } from "./range";

export function mkState(toks: Tok[][]): State {
  return {
    cframe: {
      pc: 0,
      program: { first: 0, last: 0 },
      defining: true,
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

function popStack(state: State): undefined | { elt: StackEntry, newState: State } {
  if (state.stack.length == 0)
    return undefined;
  const elt = state.stack.at(-1)!;
  const newState = produce(state, s => {
    s.stack.pop();
  });
  return { elt, newState };
}

function popCtl(state: State): undefined | { elt: CtlEntry, newState: State } {
  if (state.ctl.length == 0)
    return undefined;
  const elt = state.ctl.at(-1)!;
  const newState = produce(state, s => {
    s.ctl.pop();
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
    term = { t: 'pi', name: ctx[i].name, a: ctx[i].klass, b: term };
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


function errorState(state: State, msg: string): State {
  return produce(state, s => { s.error = msg; });
}

function callIdent(state: State, name: string): State {
  const sigent = state.sig.find(se => se.name == name);
  if (sigent == undefined) {
    return errorState(state, `couldn't find ${name}`);
  }
  return produce(state, s => {
    s.ctl.push(state.cframe);
    s.cframe.pc = sigent.program.first - 1; // because we'll increment it later
    s.cframe.defining = false;
  });
}

function execInstruction(state: State, inst: Tok, pc: number): State {
  switch (inst.t) {
    case 'type': return produce(state, s => {
      s.cframe.program.last = pc;
      s.stack.push({ term: { t: 'type' }, klass: { t: 'kind' } });
    });

    case '.': {
      if (state.cframe.defining) {
        const popResult = popStack(state);
        if (popResult == undefined)
          return produce(state, s => { s.error = `stack underflow during .`; });
        const { elt, newState } = popResult;
        if (elt.klass.t != 'type' && elt.klass.t != 'kind') {
          return produce(state, s => { s.error = `expected classifier on stack during .`; });
        }
        const emptyProgram: Tok[] = [];
        return produce(newState, s => {
          s.sig.push({
            name: inst.name ?? '_',
            klass: elt.term,
            program: state.cframe.program,
          });
          s.cframe.program = { first: pc + 1, last: pc };
        });
      }
      else {
        let ms = state;

        const popCtlResult = popCtl(ms);
        if (popCtlResult == undefined)
          return errorState(ms, `ctl underflow during :`);
        const { elt: cframe, newState: state0 } = popCtlResult;
        ms = state;

        const popStackResult = popStack(ms);
        if (popStackResult == undefined)
          return errorState(state, `ctl underflow during :`);
        const { elt: sframe, newState: state1 } = popStackResult;
        ms = state1;

        const name = inst.name;
        if (name == undefined) {
          return errorState(state, `expected constant to be named during :`);
        }

        return produce(ms, s => {
          s.cframe = cframe;
          s.stack.push({ term: { t: 'appc', cid: name, spine: [] }, klass: sframe.term })
        });
      }
    }

    case 'id': {
      switch (inst.name) {
        case 'o':
          return callIdent(state, 'o');

        case 'l':
          return produce(state, s => {
            s.cframe.program.last = pc;
            s.stack.push({
              term: { t: 'appc', cid: 'l', spine: [] },
              klass: { t: 'appc', cid: 'o', spine: [] },
            });
          });

        case 'k':
          return produce(state, s => {
            s.cframe.program.last = pc;
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
            s.cframe.program.last = pc;
            s.stack.push({
              term: { t: 'appc', cid: 's', spine: [elt.term] },
              klass: { t: 'appc', cid: 'o', spine: [] }
            });
          });
        }

        case 'b': {
          const popResult1 = popStack(state);
          if (popResult1 == undefined)
            return produce(state, s => { s.error = `stack underflow during s`; });
          const { elt: elt1, newState: newState1 } = popResult1;
          if (!exprEqual(elt1.klass, { t: 'appc', cid: 'o', spine: [] })) {
            return produce(state, s => { s.error = `type mismatch during s`; });
          }

          const popResult2 = popStack(newState1);
          if (popResult2 == undefined)
            return produce(newState1, s => { s.error = `stack underflow during s`; });
          const { elt: elt2, newState: newState2 } = popResult2;
          if (!exprEqual(elt2.klass, { t: 'appc', cid: 'o', spine: [] })) {
            return produce(newState1, s => { s.error = `type mismatch during s`; });
          }

          return produce(newState2, s => {
            s.cframe.program.last = pc;
            s.stack.push({
              term: { t: 'appc', cid: 'b', spine: [elt1.term, elt2.term] },
              klass: { t: 'type' }
            });
          });
        }

        case 'x':
          return produce(state, s => {
            s.cframe.program.last = pc;
            s.stack.push({
              term: { t: 'appv', head: 'x', spine: [] },
              klass: { t: 'appc', cid: 'o', spine: [] },
            });
          });

        default: return produce(state, s => {
          s.error = `unimplemented identifier ${inst.name}`;
        });
      }
    }

    case '->': {
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
        s.cframe.program.last = pc;
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
  state = execInstruction(state, state.toks[state.cframe.pc], state.cframe.pc);
  state = produce(state, s => { s.cframe.pc++; });
  if (state.cframe.pc >= state.toks.length) return undefined;
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
