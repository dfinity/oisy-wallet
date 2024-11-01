import { ZodType, type ZodTypeDef } from 'zod';

export const safeParse = <T, Fallback extends T | undefined = undefined>({
	schema,
	value,
	fallback = undefined
}: {
	schema: ZodType<T, ZodTypeDef, unknown>;
	value: unknown;
	fallback?: Fallback;
}): Fallback extends undefined ? T | undefined : T => {
	const { success, data } = schema.safeParse(value);

	return success ? data : (fallback as Fallback extends undefined ? T | undefined : T);
};
