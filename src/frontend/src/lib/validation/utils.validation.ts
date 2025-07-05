import type * as z from 'zod/v4';

interface SafeParseParams<T, Fallback> {
	schema: z.ZodType<T>;
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
