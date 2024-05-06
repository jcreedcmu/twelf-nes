// Prototype of forth-elf typechecker idea
import * as fs from 'fs';

const input = fs.readFileSync('input.txt', 'utf8').split(/\s+/).filter(x => x.length);
const state = {
  sig: [],
  stack: [],
  context: [],
  program: [],
  name: '_',
};

function getSpineFromStack(G, klass) {
  switch (klass.t) {
  case 'type': return [];
  case 'appc': return [];
  case 'appv': return [];
  case 'pi': {
	 let item = state.stack.pop(); // XXX typecheck item against a
	 console.log(`sig: ${state.sig.map(JSON.stringify).join("\n")}`);
	 console.log(`ctx: ${JSON.stringify(G)}`);
	 console.log(`---> ${JSON.stringify(item)} should have type ${JSON.stringify(klass.a)}`);
	 const spine = getSpineFromStack([...G, klass.a], klass.b);
	 return [item, ...spine];
  }
  }
}

function replaceWithVar(e, oldLevel, n) {
  switch (e.t) {
  case 'pi':
	 return {t: 'pi', a: replaceWithVar(e.a, oldLevel, n), b: replaceWithVar(e.b, oldLevel, n+1)};
  case 'appc':
	 if (e.level == oldLevel)
		return {t: 'appv', head: n, spine: e.spine.map(e => replaceWithVar(e, oldLevel, n))};
	 else
		return {t: 'appc', level: e.level, spine: e.spine.map(e => replaceWithVar(e, oldLevel, n))};
  case 'appv':
		return {t: 'appv', head: e.head, spine: e.spine.map(e => replaceWithVar(e, oldLevel, n))};
  case 'type': return e;
  }
}

let i = 0;


while (i < input.length) {
  const tok = input[i];
  // console.log(`got token: ${tok}`);
  switch (tok) {
  case '{': {
	 state.name = '_';
	 state.program.push('{');
  } break;

  case '}': {
	 i++; const name = input[i]; // XXX: risk of running off end of input
	 state.program.push('}');
	 state.program.push(name);
	 state.sig.push({name, program: state.program});
	 state.program = [];
	 state.context = [];
  } break;

  case 'type': state.stack.push({ x: {t: 'type'}, k: {t: 'kind'}}); break;

  case ':' {
	 i++; state.name = input[i]; // XXX: risk of running off end of input
  } break;

  case '→': {
	 state.program.push('→');
	 const top = state.stack.pop();
	 if (!(top.k.t == 'type' || top.k.t == 'kind')) {
		throw new Error(`tried to bind non-classifier`);
	 }
	 state.context.push({name, k: top.x});
  }
  default: {
	 const vlev = state.context.findIndex(frame => frame.name == tok);
	 if (vlev == -1) {
		const cid = state.sig.findIndex(frame => frame.name == tok);
		if (cid == -1) throw new Error(`${tok} not found in context or signature`);
		// found in signature
		state.program.push(tok);

	 }
	 else {
		// found in context
		const vix = state.context.length - 1 - vlev;
		state.program.push(vix);
	 }
  } break;
  }
  i++;
}
console.log(JSON.stringify(state, null, 2));
