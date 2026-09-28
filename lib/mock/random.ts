/** Deterministic PRNG so mock data is stable across reloads. */
export function createRandom(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];
  const chance = (p: number) => next() < p;

  /** Picks by weight: `weighted([["A", 5], ["B", 1]])`. */
  const weighted = <T,>(entries: readonly (readonly [T, number])[]): T => {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = next() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };

  const sample = <T,>(arr: readonly T[], count: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < count && copy.length) {
      out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
    }
    return out;
  };

  return { next, int, pick, chance, weighted, sample };
}

export type Random = ReturnType<typeof createRandom>;
