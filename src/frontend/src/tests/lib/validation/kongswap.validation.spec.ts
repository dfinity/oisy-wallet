import { KongSwapTokenSchema } from '$lib/types/kongswap';
import { createMockKongSwapToken } from '$tests/mocks/kongswap.mock';

describe('Schema: KongSwapTokenSchema', () => {
	it('validates a fully correct token', () => {
		const mock = createMockKongSwapToken({});

		const parsed = KongSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBeTruthy();
	});

	it('accepts nulls in explicitly nullable fields', () => {
		const mock = createMockKongSwapToken({
			token: {
				address: null,
				fee_fixed: null,
				logo_url: null,
				logo_updated_at: null
			},
			metrics: {
				total_supply: null,
				market_cap: null,
				previous_price: null
			}
		});
		const parsed = KongSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBeTruthy();
	});

	it('accepts optional fields when omitted', () => {
		const mock = createMockKongSwapToken({});

		const parsed = KongSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBeTruthy();
	});
});
