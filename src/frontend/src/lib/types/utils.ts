export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

export type ResultSuccess<T = unknown> = { success: boolean; err?: T };

export type ResultSuccessReduced<T = unknown> = ResultSuccess<T[]>;

// We disable the eslint rule here because this is the utility type that we use to define such rule.
// eslint-disable-next-line local-rules/use-option-type-wrapper
export type Option<T> = T | null | undefined;
