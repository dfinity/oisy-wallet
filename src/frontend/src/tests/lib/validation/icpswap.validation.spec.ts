import { IcpSwapResponseSchema, IcpSwapTokenSchema } from '$lib/types/icpswap';
import { createMockIcpSwapToken } from '$tests/mocks/icpswap.mock';

describe('Schema: IcpSwapTokenSchema', () => {
	it('validates a fully correct token', () => {
		const mock = createMockIcpSwapToken();

		const parsed = IcpSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBeTruthy();
	});

	it('rejects non-numeric price strings', () => {
		const mock = createMockIcpSwapToken({ price: 'not-a-number' });

		const parsed = IcpSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBeFalsy();
	});

	it('accepts null message in response schema', () => {
		const response = {
			code: 200,
			message: null,
			data: createMockIcpSwapToken()
		};

		const parsed = IcpSwapResponseSchema.safeParse(response);

		expect(parsed.success).toBeTruthy();
	});

	it('rejects missing required fields', () => {
		const { price: _, ...incomplete } = createMockIcpSwapToken();

		const parsed = IcpSwapTokenSchema.safeParse(incomplete);

		expect(parsed.success).toBeFalsy();
	});
});
