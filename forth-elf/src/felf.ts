// Prototype of forth-elf typechecker idea
import * as fs from 'fs';



type Expr =
  | { t: 'type' }
  | { t: 'kind' }
  | { t: 'pi', a: Expr, b: Expr }
  | { t: 'appc', cid: number, spine: Expr[] }
  | { t: 'appv', head: number }
  ;
type SigFrame = {
  name: string,
  klass: Expr,
  program: Program,
};

type StackFrame = { x: Expr, k: Expr };
type DefContextFrame = { name: string, k: Expr };

type Instr =
  | { t: '{' }
  | { t: '}', cid: number }
  | { t: 'deb', ix: number }
  | { t: 'call', cid: number }
  | { t: '→' } // "pop value"
  | { t: 'type' }
  ;

type Program = Instr[];
type EvalContextFrame = StackFrame;
type State = {
  sig: SigFrame[],
  stack: StackFrame[],
  dctx: DefContextFrame[],
  ectxs: EvalContextFrame[][], // everything involving these should involve shift/unshift, not push/pop
  program: Program,
  name: string,
}

const state: State = {
  sig: [],
  stack: [],
  program: [],
  dctx: [],
  ectxs: [],
  name: '_',
};

function replaceWithVar(e: Expr, oldLevel: number, n: number): Expr {
  switch (e.t) {
    case 'pi':
      return { t: 'pi', a: replaceWithVar(e.a, oldLevel, n), b: replaceWithVar(e.b, oldLevel, n + 1) };
    case 'appc':
      if (e.cid == oldLevel)
        return { t: 'appv', head: n };
      else
        return { t: 'appc', cid: e.cid, spine: e.spine.map(e => replaceWithVar(e, oldLevel, n)) };
    case 'appv':
      return { t: 'appv', head: e.head };
    case 'type': return e;
    case 'kind': return e;
  }
}

function instrToString(instr: Instr) {
  switch (instr.t) {
    case '{': return '{';
    case '}': return `} (${state.sig[instr.cid].name})`;
    case 'deb': return `[${instr.ix}]`;
    case 'call': return `${state.sig[instr.cid].name}`;
    case '→': return `→`;
    case 'type': return `type`;
  }
}

function progToString(program: Program) {
  return program.map(instrToString).join(" ");
}
function sigFrameToString(frame: SigFrame) {
  return `${frame.name} : ${exprToString(frame.klass)} [${progToString(frame.program)}]`;
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
    case 'appc': return appToSpine(state.sig[e.cid].name, e.spine);
    case 'appv': return `v${e.head}`;
  }
}

function stackFrameToString(frame: StackFrame) {
  return `${exprToString(frame.x)} : ${exprToString(frame.k)}`;
}

function dctxFrameToString(frame: DefContextFrame) {
  return `${frame.name} : ${exprToString(frame.k)}`;
}

function stateToString(state: State) {
  const STACK = state.stack.map(stackFrameToString).map(x => `    ${x}\n`).join('');
  const DCTX = state.dctx.map(dctxFrameToString).map(x => `    ${x}\n`).join('');
  const SIG = state.sig.map(sigFrameToString).map(x => `    ${x}\n`).join('');
  return `===
NAME: ${state.name}
STACK:
${STACK}DCTX:
${DCTX}SIG:
${SIG}`;
}

function flatten(e: Expr): string[] {
  switch (e.t) {
    case 'type': return ['type'];
    case 'kind': return ['kind'];
    case 'pi': throw new Error(`Didn't expect to flatten anything but base types!`);
    case 'appc': {
      const spine: string[] = e.spine.map(x => flatten(x)).reverse().flatMap(x => x);
      return [...spine, state.sig[e.cid].name];
    }
    case 'appv': throw new Error(`didn't expect to flatten variable applications`);
  }
}

function assertEqual(e1: Expr, e2: Expr) {
  const f1 = flatten(e1).join(" ");
  const f2 = flatten(e2).join(" ");
  if (f1 != f2) {
    throw new Error(`type error ${f1} != ${f2}`);
  }
  else {
    console.log(`success: ${f1} = ${f2}`);
  }
}

function runProgram(program: Program) {
  let ix = 0;
  while (ix < program.length) {
    const tok = program[ix];
    switch (tok.t) {
      case '{': {
        state.ectxs.unshift([]);
      } break;
      case '}': {
        ix++;
        const name = program[ix]; // XXX: risk of running off end of input
        const cid = tok.cid;
        const a = state.stack.pop();
        if (a == undefined) {
          throw new Error(`underflow during close-brace`);
        }
        if (!(a.k.t == 'type' || a.k.t == 'kind')) {
          throw new Error(`tried to close-brace non-classifier '${JSON.stringify(a)}'`);
        }
        const ectx = state.ectxs.shift();
        if (ectx == undefined) {
          throw new Error(`underflow during close-brace ectx pop`);
        }
        const spine = ectx.map(ec => ec.x).reverse();
        state.stack.push({ x: { t: 'appc', cid, spine }, k: a.x });
      } break;
      case 'type': {
        state.stack.push({ x: { t: 'type' }, k: { t: 'kind' } });
      } break;
      case '→': {
        const v1 = state.stack.pop();
        if (v1 == undefined) {
          throw new Error(`underflow during →1`);
        }
        const v2 = state.stack.pop();
        if (v2 == undefined) {
          throw new Error(`underflow during →2`);
        }
        assertEqual(v1.x, v2.k);
        state.ectxs[0].unshift(v2);
      } break;
      case 'deb': {
        state.stack.push(state.ectxs[0][tok.ix]);
      } break;
      case 'call': {
        runProgram(state.sig[tok.cid].program);
      } break;
    }
    ix++;
  }
}

function doPi() {
  const frame = state.sig.pop();
  if (frame == undefined) {
    throw new Error(`signature underflow`);
  }

  const b = state.stack.pop();
  if (b == undefined) {
    throw new Error(`stack underflow`);
  }

  if (!(b.k.t == 'type' || b.k.t == 'kind')) {
    throw new Error(`tried to Π non-classifier`);
  }

  const oldLevel = state.sig.length;
  state.stack.push({ x: { t: 'pi', a: frame.klass, b: replaceWithVar(b.x, oldLevel, 0) }, k: b.k });
}

function absDctx(dctx: DefContextFrame[], e: Expr): Expr {
  if (dctx.length == 0) {
    return e;
  }
  return { t: 'pi', a: dctx[0].k, b: absDctx(dctx.slice(1), e) };
}

function interp(input: string[]) {
  let i = 0;

  while (i < input.length) {
    const tok = input[i];
    console.log(`got token: ${tok}`);
    switch (tok) {

      case '{': {
        state.dctx = [];
        state.program = [{ t: '{' }];
      } break;

      case '}': {
        i++;
        const name = input[i]; // XXX: risk of running off end of input


        const top = state.stack.pop();
        if (top == undefined) {
          throw new Error(`stack underflow`);
        }
        if (!(top.k.t == 'type' || top.k.t == 'kind')) {
          throw new Error(`tried to bind non-classifier`);
        }
        state.program.push({ t: '}', cid: state.sig.length });
        state.sig.push({ name, klass: absDctx(state.dctx, top.x), program: state.program });
        state.dctx = [];
        state.program = [];
        state.name = '_';

      } break;

      case 'type': {
        state.program.push({ t: 'type' });
        state.stack.push({ x: { t: 'type' }, k: { t: 'kind' } });
      } break;

      case ':': {
        i++; state.name = input[i]; // XXX: risk of running off end of input
      } break;

      case '→': {
        const top = state.stack.pop();
        if (top == undefined) {
          throw new Error(`stack underflow`);
        }
        if (!(top.k.t == 'type' || top.k.t == 'kind')) {
          throw new Error(`tried to bind non-classifier`);
        }
        state.program.push({ t: '→' });
        state.dctx.push({ name: state.name, k: top.x });
        state.name = '_';
      } break;

      default: {
        const vid = state.dctx.findIndex(frame => frame.name == tok);
        if (vid != -1) {
          const ix = state.dctx.length - vid - 1;
          state.program.push({ t: 'deb', ix });
          state.stack.push({ x: { t: 'appv', head: ix }, k: state.dctx[vid].k });
          break;
        }
        const cid = state.sig.findIndex(frame => frame.name == tok);
        if (cid != -1) {
          // found in signature
          state.program.push({ t: 'call', cid });
          runProgram(state.sig[cid].program);
          break;
        }
        throw new Error(`${tok} not found`);
      } break;
    }
    i++;
    console.log(stateToString(state));
  }
}

interp(fs.readFileSync('input.txt', 'utf8').split(/\s+/).filter(x => x.length));
