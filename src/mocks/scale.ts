/**
 * Expands a small seed list into `count` rows without shipping huge JSON. Each clone gets a
 * unique id and a per-clone tweak so sorting has real work to do.
 */
export function scaleRows<T extends { id: string }>(seed: readonly T[], count: number, tweak: (row: T, index: number) => T): T[] {
  if (seed.length === 0 || count <= 0) return [];
  if (count <= seed.length) return seed.slice(0, count);
  const out: T[] = new Array<T>(count);
  for (let i = 0; i < count; i += 1) {
    const base = seed[i % seed.length] as T;
    out[i] = i < seed.length ? base : tweak({ ...base, id: `${base.id}-${Math.floor(i / seed.length)}` }, i);
  }
  return out;
}
