import { Tok } from './state-types';

export function parse(input: string): Tok[] {
  const toks = input.split(/\n/)
    .map(x => x.replace(/#.*/g, ''))
    .flatMap(x => x.split(/\s+/))
    .filter(x => x.length != 0);
  const out: Tok[] = [];
  let name: string | undefined = undefined;
  for (let i = 0; i < toks.length; i++) {
    switch (toks[i]) {
      case 'type': out.push({ t: 'type' }); break;
      case '(': out.push({ t: '(' }); break;
      case ')': out.push({ t: ')' }); break;
      case '[': out.push({ t: '[' }); break;
      case ']': out.push({ t: ']' }); break;
      case ':': name = toks[++i]; break;
      case '>': out.push({ t: '>', name }); name = undefined; break;
      case '.': out.push({ t: '.', name }); name = undefined; break;
      default:
        out.push({ t: 'id', name: toks[i] });
    }
  }
  return out;
}
