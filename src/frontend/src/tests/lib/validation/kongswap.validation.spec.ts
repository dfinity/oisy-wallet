import {
	KongSwapTokenSchema,
	KongSwapTokensSchema,
	KongSwapTokenWithMetricsSchema
} from '$lib/types/kongswap';
import { createMockKongSwapToken } from '$tests/mocks/kongswap.mock';
import { describe, expect, it } from 'vitest';

describe('Schema: KongSwapTokenWithMetricsSchema', () => {
	it('validates a fully correct token', () => {
		const mock = createMockKongSwapToken({});

		const parsed = KongSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBe(true);
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

		expect(parsed.success).toBe(true);
	});

	it('accepts optional fields when omitted', () => {
		const mock = createMockKongSwapToken({});

		const parsed = KongSwapTokenSchema.safeParse(mock);

		expect(parsed.success).toBe(true);
	});
});

describe('Schema: KongSwapTokenWithMetricsSchema — invalid field values', () => {
	it('rejects invalid number string in "price"', () => {
		const mock = createMockKongSwapToken({
			metrics: { price: 'NaN' }
		});
		const parsed = KongSwapTokenWithMetricsSchema.safeParse({
			...mock.token,
			metrics: mock.metrics
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects invalid ISO string in "logo_updated_at"', () => {
		const mock = createMockKongSwapToken({
			token: { logo_updated_at: 'not-a-date' }
		});
		const parsed = KongSwapTokenWithMetricsSchema.safeParse({
			...mock.token,
			metrics: mock.metrics
		});

		expect(parsed.success).toBe(false);
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

		expect(parsed.success).toBe(false);
	});
});

describe('Schema: KongSwapTokenWithMetricsSchema — missing required fields', () => {
	it('rejects missing "token_id"', () => {
		const mock = createMockKongSwapToken({});
		const { token, metrics } = mock;
		const invalid = { ...token, metrics } as Record<string, unknown>;
		delete invalid.token_id;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse(invalid);

		expect(parsed.success).toBe(false);
	});

	it('rejects missing "name"', () => {
		const mock = createMockKongSwapToken({});
		const { token, metrics } = mock;
		const invalid = { ...token, metrics } as Record<string, unknown>;
		delete invalid.name;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse(invalid);

		expect(parsed.success).toBe(false);
	});

	it('rejects missing "canister_id"', () => {
		const mock = createMockKongSwapToken({});
		const { token, metrics } = mock;
		const invalid = { ...token, metrics } as Record<string, unknown>;
		delete invalid.canister_id;

		const parsed = KongSwapTokenWithMetricsSchema.safeParse(invalid);

		expect(parsed.success).toBe(false);
	});
});

describe('Schema: KongSwapTokenMetricsSchema', () => {
	it('rejects invalid ISO date in "updated_at"', () => {
		const mock = createMockKongSwapToken({
			metrics: { updated_at: 'invalid-date' }
		});
		const parsed = KongSwapTokenWithMetricsSchema.safeParse(mock.metrics);

		expect(parsed.success).toBe(false);
	});

	it('rejects wrong type for "volume_24h"', () => {
		const mock = createMockKongSwapToken({
			metrics: { volume_24h: 'NaN' }
		});
		const parsed = KongSwapTokenWithMetricsSchema.safeParse(mock.metrics);

		expect(parsed.success).toBe(false);
	});
});

describe('Schema: KongSwapTokensSchema (paginated list)', () => {
	it('validates a paginated response with multiple valid tokens', () => {
		const token1 = createMockKongSwapToken({});
		const token2 = createMockKongSwapToken({});

		const parsed = KongSwapTokensSchema.safeParse({
			items: [
				{ ...token1.token, metrics: token1.metrics },
				{ ...token2.token, metrics: token2.metrics }
			],
			page: 1,
			limit: 10,
			total_count: 2,
			total_pages: 1
		});

		expect(parsed.success).toBe(true);
	});

	it('rejects paginated list if one item is invalid', () => {
		const valid = createMockKongSwapToken({});
		const invalid = { ...createMockKongSwapToken({}) };
		(invalid.token as Record<string, unknown>).token_id = 'invalid';

		const parsed = KongSwapTokensSchema.safeParse({
			items: [
				{ ...valid.token, metrics: valid.metrics },
				{ ...invalid.token, metrics: invalid.metrics }
			],
			page: 1,
			limit: 10,
			total_count: 2,
			total_pages: 1
		});

		expect(parsed.success).toBe(false);
	});
});
