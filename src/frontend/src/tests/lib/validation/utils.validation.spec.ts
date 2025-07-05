import { safeParse } from '$lib/validation/utils.validation';
import * as z from 'zod/v4';

describe('safeParse', () => {
	const stringSchema = z.string();
	const shortStringSchema = z.string().max(3);
	const numberSchema = z.number();
	const objectSchema = z.object({
		name: z.string(),
		age: z.number()
	});

	it('should return data when value matches the schema', () => {
		expect(
			safeParse({
				schema: stringSchema,
				value: 'valid string'
			})
		).toBe('valid string');

		expect(
			safeParse({
				schema: shortStringSchema,
				value: 'foo'
			})
		).toBe('foo');

		expect(
			safeParse({
				schema: numberSchema,
				value: 42
			})
		).toBe(42);

		expect(
			safeParse({
				schema: objectSchema,
				value: { name: 'Alice', age: 30 }
			})
		).toEqual({ name: 'Alice', age: 30 });
	});

	it('should return fallback when value does not match the schema', () => {
		expect(
			safeParse({
				schema: shortStringSchema,
				value: 'too long string',
				fallback: 'fallback string'
			})
		).toBe('fallback string');

		expect(
			safeParse({
				schema: objectSchema,
				value: { name: 'Alice' },
				fallback: { name: 'Bob', age: 30 }
			})
		).toEqual({ name: 'Bob', age: 30 });
	});

	it('should return undefined when value does not match the schema and no fallback is provided', () => {
		expect(
			safeParse({
				schema: shortStringSchema,
				value: 'too long string'
			})
		).toBeUndefined();

		expect(
			safeParse({
				schema: objectSchema,
				value: { name: 'Alice' }
			})
		).toBeUndefined();
	});
});
