// Prototype of forth-elf typechecker idea
import * as fs from 'fs';

const input = fs.readFileSync('input.txt', 'utf8').split(/\s+/).filter(x => x.length);
const state = {sig: [], stack: []};

function getSpineFromStack(klass) {
  switch (klass.t) {
  case 'type': return [];
  case 'app': return [];
  case 'pi': {
	 let item = state.stack.pop(); // XXX typecheck item against a
	 const spine = getSpineFromStack(klass.b);
	 return [item, ...spine];
  }
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
	 state.stack.push({t: 'pi', a: frame.klass, b: b});
  } break;
  default: {
	 const level = state.sig.findIndex(frame => frame.name == tok);
	 if (level == -1) throw new Error(`${tok} not found in signature`);
	 const head = state.sig.length - level;
	 const spine = getSpineFromStack(state.sig[level].klass);
	 state.stack.push({t: 'app', head, spine});
  } break;
  }
  i++;
}
console.log(JSON.stringify(state, null, 2));
