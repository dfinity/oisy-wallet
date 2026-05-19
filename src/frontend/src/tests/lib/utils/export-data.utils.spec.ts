import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import { Currency } from '$lib/enums/currency';
import type { TokenUi } from '$lib/types/token-ui';
import { buildTokenRows, TOKEN_CSV_COLUMNS, type TokenCsvRow } from '$lib/utils/export-data.utils';
import { parseTokenId } from '$lib/validation/token.validation';

const baseToken: TokenUi = {
	id: parseTokenId('test'),
	network: ICP_NETWORK,
	standard: { code: 'icrc' },
	category: 'default',
	name: 'Test Token',
	symbol: 'TST',
	decimals: 8
};

describe('export-data.utils', () => {
	describe('buildTokenRows', () => {
		const exportedAt = new Date('2026-05-19T08:30:00Z');

		it('maps a token with full financial data to a row', () => {
			const rows = buildTokenRows({
				tokens: [
					{
						...baseToken,
						balance: 12345678n,
						usdPrice: 10,
						usdBalance: 1.2345678
					}
				],
				currency: Currency.EUR,
				exchangeRateToUsd: 0.9,
				exportedAt
			});

			expect(rows).toHaveLength(1);
			expect(rows[0]).toEqual<TokenCsvRow>({
				symbol: 'TST',
				name: 'Test Token',
				network: ICP_NETWORK.name,
				standard: 'icrc',
				address_or_ledger_id: '',
				decimals: 8,
				balance: '0.12345678',
				usd_price: 10,
				usd_value: 1.2345678,
				currency: 'EUR',
				price: 9,
				value: 1.11111102,
				snapshot_at: '2026-05-19T08:30:00.000Z'
			});
		});

		it('leaves price and value undefined when the exchange rate has not loaded', () => {
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: 1n, usdPrice: 1, usdBalance: 1 }],
				currency: Currency.EUR,
				exchangeRateToUsd: null,
				exportedAt
			});

			expect(row.price).toBeUndefined();
			expect(row.value).toBeUndefined();
			expect(row.usd_price).toBe(1);
			expect(row.usd_value).toBe(1);
		});

		it('passes USD through unchanged when the exchange rate is 1', () => {
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: ZERO, usdPrice: 42, usdBalance: 0 }],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.currency).toBe('USD');
			expect(row.price).toBe(42);
			expect(row.value).toBe(0);
		});

		it('renders an empty balance string when the balance is null', () => {
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: null }],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.balance).toBe('');
		});

		it('formats balance with full precision using the token decimals', () => {
			const [row] = buildTokenRows({
				tokens: [
					{
						...baseToken,
						decimals: 18,
						balance: 1_234_567_890_123_456_789n
					}
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.balance).toBe('1.234567890123456789');
		});

		it('reads ledgerCanisterId for IC tokens that expose it', () => {
			const [row] = buildTokenRows({
				tokens: [
					{
						...baseToken,
						balance: ZERO,
						ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai'
					} as TokenUi
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.address_or_ledger_id).toBe('mxzaz-hqaaa-aaaar-qaada-cai');
		});

		it('reads address for ERC20 / SPL tokens that expose it', () => {
			const [row] = buildTokenRows({
				tokens: [
					{
						...baseToken,
						balance: ZERO,
						address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
					} as TokenUi
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.address_or_ledger_id).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
		});

		it('writes the same snapshot_at on every row', () => {
			const rows = buildTokenRows({
				tokens: [
					{ ...baseToken, balance: 1n },
					{ ...baseToken, balance: 2n }
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(rows[0].snapshot_at).toBe('2026-05-19T08:30:00.000Z');
			expect(rows[1].snapshot_at).toBe('2026-05-19T08:30:00.000Z');
		});
	});

	describe('TOKEN_CSV_COLUMNS', () => {
		it('lists the 13 documented columns in order', () => {
			expect(TOKEN_CSV_COLUMNS.map(({ key }) => key)).toEqual([
				'symbol',
				'name',
				'network',
				'standard',
				'address_or_ledger_id',
				'decimals',
				'balance',
				'usd_price',
				'usd_value',
				'currency',
				'price',
				'value',
				'snapshot_at'
			]);
		});
	});
});
