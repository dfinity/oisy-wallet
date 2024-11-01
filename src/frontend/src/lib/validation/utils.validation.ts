import { ZodType, type ZodTypeDef } from 'zod';

export const safeParse = <T>({
	schema,
	value,
	fallback = undefined
}: {
	schema: ZodType<T, ZodTypeDef, unknown>;
	value: unknown;
	fallback?: T | undefined;
}): T | undefined => {
	const { success, data } = schema.safeParse(value);

	return success ? data : fallback;
};
