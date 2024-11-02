import type { ZodType, ZodTypeDef } from 'zod';

interface SafeParseParams<T, Fallback> {
	schema: ZodType<T, ZodTypeDef, unknown>;
	value: unknown;
	fallback?: Fallback;
}

type SafeParseReturn<T, Fallback> = Fallback extends undefined ? T | undefined : T;

export const safeParse = <T, Fallback extends T | undefined = undefined>({
	schema,
	value,
	fallback = undefined
}: SafeParseParams<T, Fallback>): SafeParseReturn<T, Fallback> => {
	const { success, data } = schema.safeParse(value);

	return success ? data : (fallback as SafeParseReturn<T, Fallback>);
};
