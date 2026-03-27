export type RequiredExcept<T, K extends keyof T, M extends object = {}> = Required<
	Omit<T, Extract<K | keyof M, keyof T>>
> &
	Pick<T, Extract<K | keyof M, keyof T>>;

export interface ResultSuccess<T = unknown> {
	success: boolean;
	err?: T;
}

export type PartialSpecific<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Returns all keys of a union type. For example:
 *   KeyOfUnion<{ a: number } | { b: string } | { d: { ... } }>
 * will result in: 'a' | 'b' | 'd'
 */
export type KeysOfUnion<T> = T extends unknown ? keyof T : never;
