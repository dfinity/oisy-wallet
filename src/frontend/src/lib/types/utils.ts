export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

export type SuccessOrNot<T = unknown> = { success: boolean; err?: T };
