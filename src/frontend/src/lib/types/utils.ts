export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

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
