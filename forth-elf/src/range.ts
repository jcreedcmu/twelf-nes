export type Rng = { first: number; last: number; };

export function in_range(index: number, range: Rng) {
  return index >= range.first && index <= range.last;
}
