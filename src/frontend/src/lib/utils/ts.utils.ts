// Source: https://stackoverflow.com/a/66605669/5404186
export type Only<T, U> = {
	[P in keyof T]: T[P];
} & {
	[P in keyof U]?: never;
};

export type Either<T, U> = Only<T, U> | Only<U, T>;

export type OneOf<T extends readonly unknown[]> = T extends [infer First, ...infer Rest]
	? Rest extends readonly [unknown, ...unknown[]]
		? Either<First, OneOf<Rest>>
		: First
	: never;
