import { produce } from 'immer';
import { Sub, CtlEntry, Ctx, Expr, MetaCtxEntry, StackEntry, State, Tok, Toks, SigEntry, LabDataFrameStackEntry } from './state-types';
import { Rng } from "./range";
import { tokenToString } from 'typescript';
import { stringOfTok } from './render-state';

const ITERATIONS_LIMIT = 1000;

export function mkState(toks: Tok[][]): State {
  return {
    cframe: {
      pc: 0,
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

function formPi(ctx: Ctx, base: StackEntry, name: string | undefined, pc: number): LabDataFrameStackEntry {
  let term = base.term;
  for (let i = ctx.length - 1; i >= 0; i--) {
    term = { t: 'pi', name: ctx[i].name, a: ctx[i].klass, b: term };
  }
  return { t: 'LabDataFrame', term, klass: base.klass, name, pc };
}


function formLambda(ctx: Ctx, base: StackEntry, name: string | undefined, pc: number): StackEntry {
  let term = base.term;
  let klass = base.klass;
  for (let i = ctx.length - 1; i >= 0; i--) {
    term = { t: 'lam', name: ctx[i].name, a: ctx[i].klass, m: term };
    klass = { t: 'pi', name: ctx[i].name, a: ctx[i].klass, b: klass };
  }
  return { t: 'LabDataFrame', term, klass, name, pc };
}

function formRoot(name: string, sub: Sub, base: StackEntry): StackEntry {
  return {
    t: 'DataFrame',
    term: { t: 'appc', cid: name, spine: sub.map(x => x.term) },
    klass: base.term
  };
}

// XXX neither sound nor complete, for alpha variance reasons
function flatten(e: Expr): string[] {
  switch (e.t) {
    case 'type': return ['type'];
    case 'kind': return ['kind'];
    case 'pi': return ['pi', '_', ':', ...flatten(e.a), '.', ...flatten(e.b)];
    case 'lam': return ['lam', '_', ':', ...flatten(e.a), '.', ...flatten(e.m)];
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

type FindIdentResult =
  | { t: 'sigEntry', se: SigEntry }
  | { t: 'subEntryTerm', klass: Expr, term: Expr }
  | { t: 'subEntryPc', klass: Expr, pc: number }
  ;

function findIdent(state: State, name: string): FindIdentResult {
  // XXX wrong direction?
  const sigent = state.sig.find(se => se.name == name);

  if (sigent != undefined) {
    return { t: 'sigEntry', se: sigent };
  }

  for (let i = state.meta.length - 1; i >= 0; i--) {
    const frame = state.meta[i];
    if (frame.t == 'sub') {
      // XXX wrong direction?
      const found = frame.sub.findIndex(e => e.name == name)
      if (found != -1) {
        // XXX some very bad special casing on lambdas
        if (frame.sub[found].term.t == 'lam') {
          return {
            t: 'subEntryPc',
            klass: frame.sub[found].klass,
            pc: frame.sub[found].pc, // I think I can trust this one to be not -1
          };
        }
        else {
          return {
            t: 'subEntryTerm',
            klass: frame.sub[found].klass,
            term: frame.sub[found].term, // This is wrong, it should be more like a pc?
          };
        }
      }
    }
    if (frame.t == 'ctx') {
      // XXX wrong direction?
      const found = frame.ctx.findIndex(e => e.name == name)
      if (found != -1) {
        return {
          t: 'sigEntry', se: {
            name,
            klass: frame.ctx[found].klass,
            pc: frame.ctx[found].pc,
          }
        }
      }
    }
  }

  throw new Step(`couldn't find ${name}`);
}

function callIdent(state: State, name: string): State {

  const sigma: MetaCtxEntry = {
    t: 'sub',
    pc: state.cframe.pc,
    sub: [],
  };

  const result = findIdent(state, name);

  switch (result.t) {
    case 'sigEntry':
      state = produce(state, s => {
        s.meta.push(sigma);
      });
      // XXX all I use of sigentry is pc, apparently?
      return produce(state, s => {
        s.ctl.push(state.cframe);
        s.cframe.pc = result.se.pc;
      });
    case 'subEntryTerm':
      return produce(state, s => {
        s.stack.push({ t: 'DataFrame', klass: result.klass, term: result.term })
      });
    case 'subEntryPc':
      return produce(state, s => {
        s.meta.push(sigma);
        s.ctl.push(state.cframe);
        s.cframe.pc = result.pc;
      });
  }
}

function doOpenBracket(state: State): State {
  const gamma: MetaCtxEntry = {
    t: 'ctx',
    ctx: [],
    pc: state.cframe.pc,
  };

  return produce(state, s => {
    s.meta.push(gamma);
  });
}

function doCloseBracket(state: State): State {
  const pc = state.cframe.pc;
  let metaEntry;
  ({ elt: metaEntry, newState: state } = popMeta(state));

  switch (metaEntry.t) {
    case 'ctx': {
      let stackEntry;
      ({ elt: stackEntry, newState: state } = popStack(state));
      // stackEntry is now body of lambda

      const newStackEntry: StackEntry = formLambda(metaEntry.ctx, stackEntry, state.cframe.name, metaEntry.pc);

      return produce(state, s => {
        s.cframe.name = undefined;
        s.stack.push(newStackEntry);
      });
    }
    case 'sub': {

      let cframe;
      ({ elt: cframe, newState: state } = popCtl(state));

      // *Don't* pop stack? Just leave it where it is??

      // let sframe;
      // ({ elt: sframe, newState: state } = popStack(state));

      return produce(state, s => {
        s.cframe = cframe;
      });
    }
  }
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

  if (state.meta.length == 0) { // case 1/3: signature
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
    // case 2/3: context
    case 'ctx': {
      let elt;
      ({ elt, newState: state } = popStack(state));

      if (elt.t != 'LabDataFrame')
        throw new Step(`expected labelled data frame on stack during ->`);

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
      // case 3/3: substitution
      let elt1; // A : type
      ({ elt: elt1, newState: state } = popStack(state));

      if (elt1.t != 'LabDataFrame')
        throw new Step(`expected labelled data frame on stack during ->`);

      let elt2; // M : A
      ({ elt: elt2, newState: state } = popStack(state));

      if (!exprEqual(elt1.term, elt2.klass)) {
        throw new Step(`type mismatch`);
      }

      let pc = -1;
      if (elt2.t == 'LabDataFrame') {
        pc = elt2.pc;  // this has a chance of being right if elt2 was a lambda
      }
      const sub = produce(oldCtx.sub, c => {
        c.push({
          term: elt2.term,
          name: elt1.name,
          klass: elt1.term,
          pc,
        });
      });
      return produce(state, s => {
        s.cframe.name = undefined;
        s.meta[state.meta.length - 1] = { t: 'sub', pc: elt1.pc, sub };
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

    case '[': return doOpenBracket(state);
    case ']': return doCloseBracket(state);

    case ':': {
      return produce(state, s => {
        s.cframe.readingName = true;
      });
    }
    case 'EOF': {
      throw new Step(`halt`);
    }
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
