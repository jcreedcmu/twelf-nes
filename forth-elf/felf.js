// Prototype of forth-elf typechecker idea
import * as fs from 'fs';

const input = fs.readFileSync('input.txt', 'utf8').split(/\s+/).filter(x => x.length);
const state = {sig: [], stack: []};

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
  case ':': {
	 i++; const name = input[i]; // XXX: risk of running off end of input
	 const klass = state.stack.pop();
	 state.sig.push({name, klass});
  } break;
  case 'type': state.stack.push({t: 'type'}); break;
  case 'Π': {
	 const frame = state.sig.pop();
	 const b = state.stack.pop();
	 const oldLevel = state.sig.length;
	 state.stack.push({t: 'pi', a: frame.klass, b: replaceWithVar(b, oldLevel, 0)});
  } break;
  default: {
	 const level = state.sig.findIndex(frame => frame.name == tok);
	 if (level == -1) throw new Error(`${tok} not found in signature`);
	 const head = state.sig.length - level;
	 const spine = getSpineFromStack([], state.sig[level].klass);
	 state.stack.push({t: 'appc', level, spine});
  } break;
  }
  i++;
}
console.log(JSON.stringify(state, null, 2));
