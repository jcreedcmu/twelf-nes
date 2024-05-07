// Prototype of forth-elf typechecker idea
import * as fs from 'fs';



type Expr =
  | { t: 'type' }
  | { t: 'kind' }
  | { t: 'pi', a: Expr, b: Expr }
  | { t: 'appc', level: number, spine: Expr[] }
  | { t: 'appv', head: number }
  ;
type SigFrame = {
  name: string,
  klass: Expr,
  program: Program,
};

type StackFrame = { x: Expr, k: Expr };
type DefContextFrame = { name: string, k: Expr };
type Program = string[];

type State = {
  sig: SigFrame[],
  stack: StackFrame[],
  dctx: DefContextFrame[],
  program: Program,
  name: string,
}

const state: State = {
  sig: [],
  stack: [],
  program: [],
  dctx: [],
  name: '_',
};

function replaceWithVar(e: Expr, oldLevel: number, n: number): Expr {
  switch (e.t) {
    case 'pi':
      return { t: 'pi', a: replaceWithVar(e.a, oldLevel, n), b: replaceWithVar(e.b, oldLevel, n + 1) };
    case 'appc':
      if (e.level == oldLevel)
        return { t: 'appv', head: n };
      else
        return { t: 'appc', level: e.level, spine: e.spine.map(e => replaceWithVar(e, oldLevel, n)) };
    case 'appv':
      return { t: 'appv', head: e.head };
    case 'type': return e;
    case 'kind': return e;
  }
}


function sigFrameToString(frame: SigFrame) {
  return `${frame.name} : ${exprToString(frame.klass)} [${frame.program.join(" ")}]`;
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
    case 'appc': return appToSpine(state.sig[e.level].name, e.spine);
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

function runProgram(program: Program) {
  for (const tok of program) {
    switch (tok) {
      case '+o': {
        state.stack.push({ x: { t: 'appc', level: 0, spine: [] }, k: { t: 'type' } });
      } break;
      case '+a': {
        state.stack.push({ x: { t: 'appc', level: 3, spine: [] }, k: { t: 'appc', level: 0, spine: [] } });
      } break;
      case '+x': {
        state.stack.push({ x: { t: 'appc', level: 4, spine: [] }, k: { t: 'appc', level: 0, spine: [] } });
      } break;
      case '+y': {
        state.stack.push({ x: { t: 'appc', level: 5, spine: [] }, k: { t: 'appc', level: 0, spine: [] } });
      } break;
      case '+k': {
        state.stack.push({ x: { t: 'appc', level: 1, spine: [] }, k: { t: 'appc', level: 0, spine: [] } });
      } break;
      case '+b': {
        const f1 = state.stack.pop()!;
        const f2 = state.stack.pop()!;
        state.stack.push({ x: { t: 'appc', level: 2, spine: [f1.x, f2.x] }, k: { t: 'type' } });
      } break;
      case '+q': {
        const f1 = state.stack.pop()!;
        const f2 = state.stack.pop()!;
        state.stack.push({
          x: { t: 'appc', level: 4, spine: [f1.x, f2.x] },
          k: { t: 'appc', level: 2, spine: [f1.x, f2.x] }
        });
      } break;
      case '+c': {
        const f1 = state.stack.pop()!;
        const f2 = state.stack.pop()!;
        state.stack.push({
          x: { t: 'appc', level: 3, spine: [f1.x, f2.x] },
          k: { t: 'type' },
        });
      } break;
      default:
        throw new Error(`unknown program instruction ${tok}`);
    }
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
        state.program = ['{'];
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
        state.program.push('}');
        state.program.push(name);
        console.log('program would be', state.program.join(" "));
        state.sig.push({ name, klass: absDctx(state.dctx, top.x), program: ["+" + name] });
        state.dctx = [];
        state.program = [];
        state.name = '_';

      } break;

      case 'type': {
        state.program.push('type');
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
        state.program.push('→');
        state.dctx.push({ name: state.name, k: top.x });
        state.name = '_';
      } break;

      default: {
        const vid = state.dctx.findIndex(frame => frame.name == tok);
        if (vid != -1) {
          const ix = state.dctx.length - vid - 1;
          state.program.push(ix.toString());
          state.stack.push({ x: { t: 'appv', head: ix }, k: state.dctx[vid].k });
          break;
        }
        const cid = state.sig.findIndex(frame => frame.name == tok);
        if (cid != -1) {
          // found in signature
          state.program.push(tok);
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
