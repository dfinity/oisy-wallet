export type RequiredExcept<T, K extends keyof T, M extends object = {}> = Required<
	Omit<T, Extract<K | keyof M, keyof T>>
> &
	Pick<T, Extract<K | keyof M, keyof T>>;

export interface ResultSuccess<T = unknown> {
	success: boolean;
	err?: T;
}

export type ResultSuccessReduced<T = unknown> = ResultSuccess<T[]>;

// We disable the eslint rule here because this is the utility type that we use to define such rule.
// eslint-disable-next-line local-rules/use-option-type-wrapper
export type Option<T> = T | null | undefined;

export type AtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
	{ [K in Keys]-?: Required<Pick<T, K>> & Partial<Omit<T, K>> }[Keys];

export type PartialSpecific<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Utility function for exhaustive type checking in TypeScript.
 *
 * This function is used to ensure all possible cases in a discriminated union or enum
 * are handled. When TypeScript narrows a variable to type `never`, it means all possible
 * types have been handled.
 *
 * @param params.variable - The value that should be of type `never` if all cases are handled
 * @param params.typeName - A string describing the type being checked (for error message)
 */
export const assertNever = ({
	variable,
	typeName
}: {
	variable: never;
	typeName: string;
}): never => {
	throw new Error(`Unexpected ${typeName}: ${variable}`);
};

/**
 * Returns all keys of a union type. For example:
 *   KeyOfUnion<{ a: number } | { b: string } | { d: { ... } }>
 * will result in: 'a' | 'b' | 'd'
 */
export type KeysOfUnion<T> = T extends unknown ? keyof T : never;
