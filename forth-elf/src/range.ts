import { Pc } from './state-types';

export type Rng = { first: Pc; last: Pc; };

export function in_range(pc: Pc, range: Rng) {
  if (pc.t != 'tokstream' || range.first.t != 'tokstream' || range.last.t != 'tokstream')
    return false;
  return pc.index >= range.first.index && pc.index <= range.last.index;
}
