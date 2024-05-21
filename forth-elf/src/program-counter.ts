import { Pc } from './state-types';
export function pcEqual(pc1: Pc, pc2: Pc) {
  switch (pc1.t) {
    case 'tokstream': return pc2.t == 'tokstream' && pc1.index == pc2.index;
  }
}

export function isExactTok(pc: Pc, index: number): boolean {
  return pc.t == 'tokstream' && index == pc.index;
}

export function pcNext(pc: Pc): Pc {
  switch (pc.t) {
    case 'tokstream': return { t: 'tokstream', index: pc.index + 1 };
    case 'sigEntry': return { t: 'sigEntry', sigIx: pc.sigIx, tokIx: pc.tokIx + 1 };
  }
}

// XXX is this bad?
export function pcPrev(pc: Pc): Pc {
  switch (pc.t) {
    case 'tokstream': return { t: 'tokstream', index: pc.index - 1 };
    case 'sigEntry': return { t: 'sigEntry', sigIx: pc.sigIx, tokIx: pc.tokIx - 1 };
  }
}
