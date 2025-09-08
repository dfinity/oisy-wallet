import { KongSwapTokenSchema, KongSwapTokenWithMetricsSchema } from '$lib/types/kongswap';
import { createMockKongSwapToken } from '$tests/mocks/kongswap.mock';

describe('Schema: KongSwapTokenWithMetricsSchema', () => {
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

describe('Schema: KongSwapTokenWithMetricsSchema — invalid field values', () => {
	it('rejects invalid ISO string in "logo_updated_at"', () => {
		const mock = createMockKongSwapToken({
			token: { logo_updated_at: 'not-a-date' }
		});
		const parsed = KongSwapTokenWithMetricsSchema.safeParse({
			...mock.token,
			metrics: mock.metrics
		});

		expect(parsed.success).toBeFalsy();
	});

	it('rejects wrong type for "token_id"', () => {
		const mock = createMockKongSwapToken({});
		const token = {
			...mock.token,
			token_id: 'not-a-number'
		} as unknown as Record<string, unknown>;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse({
			...token,
			metrics: mock.metrics
		});

		expect(parsed.success).toBeFalsy();
	});
});

describe('Schema: KongSwapTokenWithMetricsSchema — missing required fields', () => {
	it('rejects missing "token_id"', () => {
		const mock = createMockKongSwapToken({});
		const { token, metrics } = mock;
		const invalid = { ...token, metrics } as Record<string, unknown>;
		delete invalid.token_id;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse(invalid);

		expect(parsed.success).toBeFalsy();
	});

	it('rejects missing "name"', () => {
		const mock = createMockKongSwapToken({});
		const { token, metrics } = mock;
		const invalid = { ...token, metrics } as Record<string, unknown>;
		delete invalid.name;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse(invalid);

		expect(parsed.success).toBeFalsy();
	});

	it('rejects missing "canister_id"', () => {
		const mock = createMockKongSwapToken({});
		const { token, metrics } = mock;
		const invalid = { ...token, metrics } as Record<string, unknown>;
		delete invalid.canister_id;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse(invalid);

		expect(parsed.success).toBeFalsy();
	});
});

describe('Schema: KongSwapTokenMetricsSchema', () => {
	it('rejects invalid ISO date in "updated_at"', () => {
		const mock = createMockKongSwapToken({
			metrics: { updated_at: 'invalid-date' }
		});
		const parsed = KongSwapTokenWithMetricsSchema.safeParse(mock.metrics);

		expect(parsed.success).toBeFalsy();
	});
});
