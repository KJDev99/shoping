/**
 * Message namespaces are authored with English as the reference shape. The
 * Uzbek and Russian dictionaries must provide exactly the same keys, which
 * TypeScript enforces through `defineMessages`.
 */
export type Messages = { [key: string]: string | Messages };

export type SameShape<T> = { [K in keyof T]: T[K] extends string ? string : SameShape<T[K]> };

export function defineMessages<T extends Messages>(m: { en: T; uz: SameShape<T>; ru: SameShape<T> }) {
  return m;
}

/** Union of dotted key paths of a nested message object. */
export type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
