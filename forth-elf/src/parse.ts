import { Tok } from './state-types';

function ajoin<T>(xss: T[][], delim: T) {
  return xss.flatMap(xs => [delim, ...xs]).slice(1);
}

function parseToks(toks: string[]): Tok[] {
  const out: Tok[] = [];
  let name: string | undefined = undefined;
  for (let i = 0; i < toks.length; i++) {
    switch (toks[i]) {
      case 'type': out.push({ t: 'type' }); break;
      case '(': out.push({ t: '(' }); break;
      case ')': out.push({ t: ')' }); break;
      case '[': out.push({ t: '[' }); break;
      case ']': out.push({ t: ']' }); break;
      case ':': out.push({ t: ':' }); break;
      case '->': out.push({ t: '->' }); break;
      case '.': out.push({ t: '.' }); break;
      default:
        out.push({ t: 'id', name: toks[i] });
    }
  }
  return out;
}

export function parse(input: string): Tok[][] {
  const tokss = input.split(/\n/)
    .map(x => x.replace(/#.*/g, ''))
    .map(x => x.split(/\s+/).filter(x => x.length != 0))
    .filter(x => x.length != 0);

  return tokss.map(toks => parseToks(toks));
}
