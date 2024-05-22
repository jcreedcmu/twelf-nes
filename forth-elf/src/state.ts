import { produce } from 'immer';
import { Sub, CtlEntry, Ctx, Expr, MetaCtxEntry, StackEntry, State, Tok, Toks, Pc, DataStackEntry } from './state-types';
import { Rng } from "./range";
import { tokenToString } from 'typescript';
import { rawTok, stringOfTok } from './render-state';
import { pcNext, pcPrev } from './program-counter';

const ITERATIONS_LIMIT = 1000;

export function mkState(toks: Tok[][]): State {
  return {
    cframe: {
      pc: { t: 'tokstream', index: 0 },
      program: { first: { t: 'tokstream', index: 0 }, last: { t: 'tokstream', index: 0 } },
      code: [],
      codeDepth: 0,
      readingName: false,
      name: undefined,
    },
    ctx: [],
    meta: [{ t: 'ctx', ctx: [], code: [] }],
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

function popMeta(state: State): undefined | { elt: MetaCtxEntry, newState: State } {
  if (state.meta.length == 0)
    return undefined;
  const elt = state.meta.at(-1)!;
  const newState = produce(state, s => {
    s.meta.pop();
  });
  return { elt, newState };
}

function getPi(ctx: Ctx, base: Expr): Expr {
  let term = base;
  for (let i = ctx.length - 1; i >= 0; i--) {
    term = { t: 'pi', name: ctx[i].name, a: ctx[i].klass, b: term };
  }
  return term;
}

function formPi(ctx: Ctx, base: DataStackEntry): StackEntry {
  return {
    t: 'data',
    term: getPi(ctx, base.term),
    klass: base.klass,
    code: base.code,
  };
}

function formLambda(ctx: Ctx, base: DataStackEntry): StackEntry {
  let term = base.term;
  for (let i = ctx.length - 1; i >= 0; i--) {
    term = { t: 'lam', name: ctx[i].name, a: ctx[i].klass, m: term };
  }
  return {
    t: 'data',
    term,
    klass: getPi(ctx, base.klass),
    code: [{ t: 'id', name: 'formLambda???' }],
  };
}

function formRoot(name: string, sub: Sub, base: DataStackEntry, code?: Tok[]): StackEntry {
  return {
    t: 'data',
    term: { t: 'appc', cid: name, spine: sub.map(x => x.term) },
    klass: base.term,
    code: code ?? [{ t: 'id', name: 'formRoot???' }],
  };
}

// XXX Probably should just do legitimate equality checking
function flatten(e: Expr): string[] {
  switch (e.t) {
    case 'type': return ['type'];
    case 'kind': return ['kind'];
    case 'pi': return ['pi', ...flatten(e.a), '.', ...flatten(e.b)] // XXX doesn't respect alpha
    case 'lam': return ['lam', ...flatten(e.a), '.', ...flatten(e.m)] // XXX doesn't respect alpha
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

function callSigIdent(state: State, name: string): State {
  const sigma: MetaCtxEntry = {
    t: 'sub',
    sub: [],
    code: [],
  };

  state = produce(state, s => {
    s.meta.push(sigma);
  });

  const sigent = state.sig.findIndex(se => se.name == name);
  if (sigent == -1) {
    return errorState(state, `couldn't find ${name}`);
  }
  const cframe: StackEntry = { t: 'control', cframe: state.cframe };
  const newCframe: CtlEntry = {
    code: [],
    name: undefined,
    pc: pcPrev({ t: 'sigEntry', sigIx: sigent, tokIx: 0 }),
    program: state.cframe.program, // XXX this duplication is suspicious
    readingName: false,
    codeDepth: 0,
  }
  return produce(state, s => {
    s.stack.push(cframe);
    s.cframe = newCframe;
  });
}

function doOpenParen(state: State) {
  const gamma: MetaCtxEntry = {
    t: 'ctx',
    ctx: [],
    code: [],
  };

  return produce(state, s => {
    s.cframe.codeDepth++;
    s.meta.push(gamma);
  });
}

function doCloseParen(state: State, pc: Pc): State {
  const pr1 = popStack(state);
  if (pr1 == undefined)
    return produce(state, s => { s.error = `stack underflow during )`; });
  const { elt: stackEntry, newState: state1 } = pr1;

  if (stackEntry.t != 'data') {
    return errorState(state, `expected data frame on stack`);
  }

  if (stackEntry.klass.t != 'type' && stackEntry.klass.t != 'kind') {
    return produce(state, s => { s.error = `expected classifier on stack during .`; });
  }

  const pr2 = popMeta(state1);
  if (pr2 == undefined)
    return produce(state1, s => { s.error = `metacontext underflow during )`; });
  const { elt: metaEntry, newState: state2 } = pr2;

  if (metaEntry.t != 'ctx')
    return produce(state, s => { s.error = `expected ctx during >`; });

  let newStackEntry: StackEntry = formPi(metaEntry.ctx, stackEntry);
  if (newStackEntry.t == 'data') {
    newStackEntry = {
      t: 'data',
      term: newStackEntry.term,
      klass: newStackEntry.klass,
      code: metaEntry.code,
    }
  }
  return produce(state2, s => {
    s.cframe.codeDepth--;
    s.cframe.program.last = pc;
    s.stack.push(newStackEntry);
  });
}

function doLambdaCloseParen(state: State, pc: Pc): State {
  // pop body of lambda
  const pr1 = popStack(state);
  if (pr1 == undefined)
    return produce(state, s => { s.error = `stack underflow during )`; });
  const { elt: stackEntry, newState: state1 } = pr1;

  if (stackEntry.t != 'data') {
    return errorState(state, `expected data frame on stack`);
  }

  // pop argument context
  const pr2 = popMeta(state1);
  if (pr2 == undefined)
    return produce(state1, s => { s.error = `metacontext underflow during )`; });
  const { elt: metaEntry, newState: state2 } = pr2;

  if (metaEntry.t != 'ctx')
    return produce(state, s => { s.error = `expected ctx during >`; });

  const newStackEntry: StackEntry = formLambda(metaEntry.ctx, stackEntry);

  return produce(state2, s => {
    s.cframe.codeDepth--;
    s.cframe.program.last = pc;
    s.stack.push(newStackEntry);
  });
}

function doReturn(state: State, pc: Pc): State {
  let ms = state;

  const popStackResult = popStack(ms);
  if (popStackResult == undefined)
    return errorState(state, `data underflow during :`);
  const { elt: sframe, newState: state1 } = popStackResult;
  ms = state1;

  if (sframe.t != 'data') {
    return errorState(state, `expected data frame on stack`);
  }

  const popCtlResult = popStack(ms);
  if (popCtlResult == undefined)
    return errorState(ms, `ctl underflow during :`);
  const { elt: celt, newState: state0 } = popCtlResult;
  if (celt.t != 'control') {
    return errorState(state, `expected control frame on stack`);
  }
  ms = state0;

  const popMetaResult = popMeta(ms);
  if (popMetaResult == undefined)
    return errorState(state, `ctl underflow during :`);
  const { elt: mframe, newState: state2 } = popMetaResult;
  ms = state2;

  const name = state.cframe.name;
  if (name == undefined) {
    return errorState(state, `expected constant to be named during :`);
  }

  if (mframe.t != 'sub') {
    return errorState(state, `expected sub during .`);
  }

  return produce(ms, s => {
    s.cframe = celt.cframe;
    // could put [{t: 'id', name }] here instead of [] and prevent ids
    // from adding code eagerly earlier during parsing...?
    s.stack.push(formRoot(name, mframe.sub, sframe, []));
  });
}

function doGrab(state: State, pc: Pc): State {
  const popResult1 = popStack(state);
  if (popResult1 == undefined)
    return errorState(state, `stack underflow (1) during ->`);
  const { elt: elt1, newState: ns1 } = popResult1;
  state = ns1;

  if (elt1.t != 'data') {
    return errorState(state, `expected data frame on stack`);
  }

  const popResult3 = popStack(state);
  if (popResult3 == undefined)
    return errorState(state, `stack underflow (3) during ->`);
  const { elt: elt3, newState: ns3 } = popResult3;
  state = ns3;

  if (elt3.t != 'control') {
    return errorState(state, `expected control frame on stack`);
  }

  const popResult2 = popStack(state);
  if (popResult2 == undefined)
    return errorState(state, `stack underflow (2) during ->`);
  const { elt: elt2, newState: ns2 } = popResult2;
  state = ns2;

  if (elt2.t != 'data') {
    return errorState(state, `expected data frame on stack`);
  }

  if (!exprEqual(elt1.term, elt2.klass)) {
    return errorState(state, `type mismatch`);
  }

  if (state.meta.length == 0)
    return errorState(state, `metacontext underflow during ->`);

  const oldSub = state.meta[state.meta.length - 1];
  if (oldSub.t != 'sub')
    return errorState(state, `expected sub during ->`);

  const newSub = produce(oldSub, c => {
    c.sub.push({
      term: elt2.term, name: state.cframe.name, klass: elt1.term,
      range: { first: { t: 'tokstream', index: 0 }, last: { t: 'tokstream', index: 1 } }
    });
  });
  return produce(state, s => {
    s.cframe.name = undefined;
    s.meta[state.meta.length - 1] = newSub;
    s.stack.push(elt3);
  });

}

function callVar(state: State, name: string): State {
  const { pc } = state.cframe;
  loop:
  for (let i = state.meta.length - 1; i >= 0; i--) {
    const fr = state.meta[i];
    switch (fr.t) {
      case 'sub': {
        // XXX is this search direction correct?
        const sfr = fr.sub.find(sfr => sfr.name == name);
        if (sfr == undefined)
          continue loop;
        return produce(state, s => {
          s.cframe.program.last = pc;
          s.stack.push({
            t: 'data',
            term: sfr.term,
            klass: sfr.klass,
            code: [{ t: 'id', name }],
          });
        });
      } break;
      case 'ctx': {
        // XXX is this search direction correct?
        const cfr = fr.ctx.find(cfr => cfr.name == name);
        if (cfr == undefined)
          continue loop;

        // XXX should execute variable's typechecking program instead
        return produce(state, s => {
          s.cframe.program.last = pc;
          s.stack.push({
            t: 'data',
            term: { t: 'appv', head: name, spine: [] },
            klass: cfr.klass,
            code: [{ t: 'id', name }],
          });
        });
      }
    }
  }
  return errorState(state, `couldn't find variable ${name}`);
}

function compileInstruction(state: State, inst: Tok): State {
  let ms = state;
  const popMetaResult = popMeta(ms);
  if (popMetaResult == undefined)
    return errorState(state, `ctl underflow during compile`);
  const { elt: mframe, newState: state0 } = popMetaResult;
  ms = state0;

  const newMfr = produce(mframe, s => {
    s.code.push(inst);
  });
  return produce(state0, s => {
    s.meta.push(newMfr);
  });
}


function doSemicolon(state: State, pc: Pc): State {
  const popResult = popStack(state);
  if (popResult == undefined)
    return produce(state, s => { s.error = `stack underflow during .`; });
  let elt;
  ({ elt, newState: state } = popResult);

  if (elt.t != 'data') {
    return errorState(state, `expected data frame on stack`);
  }

  if (elt.klass.t != 'type' && elt.klass.t != 'kind') {
    return produce(state, s => { s.error = `expected classifier on stack during .`; });
  }
  const emptyProgram: Tok[] = [];
  const name = state.cframe.name ?? '_';
  const metaCode: Tok[] = [...elt.code, { t: ':' }, { t: 'id', name }, { t: 'ret' }];
  return produce(state, s => {
    s.sig.push({
      name: state.cframe.name ?? '_',
      klass: elt.term,
      program: state.cframe.program,
      code: state.cframe.code,
      metaCode,
    });
    s.cframe.program = { first: pcNext(pc), last: pc };
    s.cframe.code = [];
    s.cframe.name = undefined;
  });
}

// XXX don't take pc as arg, get from cframe instead
function execInstruction(state: State, inst: Tok, pc: Pc): State {

  // also deprecated
  let metaOutInst = inst;
  switch (inst.t) {
    case '.': metaOutInst = { t: 'ret' }; break;
    case '->': metaOutInst = { t: 'grab' }; break;
  }

  // deprecated version
  const outInst = state.cframe.codeDepth == 0 ? metaOutInst : inst;

  state = produce(state, s => {
    s.cframe.code.push(outInst);
  });

  if (state.cframe.readingName) {
    return produce(state, s => {
      s.cframe.name = rawTok(inst);
      s.cframe.readingName = false;
    });
  }

  switch (inst.t) {
    case 'type': {
      state = compileInstruction(state, { t: 'type' });
      return produce(state, s => {
        s.cframe.program.last = pc;
        s.stack.push({
          t: 'data',
          term: { t: 'type' },
          klass: { t: 'kind' },
          code: [{ t: 'type' }],
        });
      });
    }

    case '.': {
      state = doCloseParen(state, pc);

      if (state.error)
        return state;

      state = doSemicolon(state, pc);

      if (state.error)
        return state;

      state = doOpenParen(state);
      return state;
    }

    case 'id': {
      switch (inst.name) {
        // all of this fallthrough intentional it's effectively an
        // explicit allow-list for constants.
        case 'o':
        case 'ell':
        case 's':
        case 'b':
        case 'k':
        case 'bt':
        case 'bt2':
        case 'e':
        case 'c':
          return callSigIdent(state, inst.name);

        // fallthrough intentional. Allow-list for variables.
        case 'x':
        case 'y':
          return callVar(state, inst.name);

        default: return produce(state, s => {
          s.error = `unimplemented identifier ${inst.name}`;
        });
      }
    }

    case '->': {
      const popResult = popStack(state);
      if (popResult == undefined)
        return produce(state, s => { s.error = `stack underflow during ->`; });
      const { elt, newState } = popResult;

      if (elt.t != 'data') {
        return errorState(state, `expected data frame on stack`);
      }

      if (state.meta.length == 0)
        return produce(state, s => { s.error = `metacontext underflow during ->`; });
      const oldCtx = state.meta[state.meta.length - 1];
      if (oldCtx.t != 'ctx')
        return produce(state, s => { s.error = `expected ctx during ->`; });
      const newCode: Tok[] = [...oldCtx.code, ...elt.code];
      const newCtx = produce(oldCtx, c => {
        c.code = newCode;
        c.ctx.push({
          name: state.cframe.name, klass: elt.term,
          range: { first: { t: 'tokstream', index: 0 }, last: { t: 'tokstream', index: 1 } }
        });
      });
      return produce(newState, s => {
        s.cframe.name = undefined;
        s.meta[state.meta.length - 1] = newCtx;

      });
    }

    case '(': return doOpenParen(state);
    case ')': return doCloseParen(state, pc);
    case '[': return doOpenParen(state);
    case ']': return doLambdaCloseParen(state, pc);

    case ':': {
      return produce(state, s => {
        s.cframe.readingName = true;
      });
    }

    case 'ret': return doReturn(state, pc);
    case 'grab': return doGrab(state, pc);
    case ';': return doSemicolon(state, pc);
  }
}

function fetch(state: State, pc: Pc): Tok {
  switch (pc.t) {
    case 'tokstream': return state.toks[pc.index];
    case 'sigEntry': return state.sig[pc.sigIx].code[pc.tokIx];
  }
}

function pcValid(state: State, pc: Pc): boolean {
  switch (pc.t) {
    case 'tokstream': return pc.index < state.toks.length;
    case 'sigEntry': return pc.tokIx < state.sig[pc.sigIx].code.length;
  }
}

export function stepForward(state: State): State | undefined {
  if (state.error)
    return undefined;
  const inst = fetch(state, state.cframe.pc);
  if (inst == undefined)
    return errorState(state, 'undefined instruction');
  state = execInstruction(state, inst, state.cframe.pc);
  const nextPc = pcNext(state.cframe.pc);
  if (!pcValid(state, nextPc)) return undefined;
  return produce(state, s => { s.cframe.pc = nextPc; });
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
  return state.stack.filter(x => x.t == 'control').length;
}
