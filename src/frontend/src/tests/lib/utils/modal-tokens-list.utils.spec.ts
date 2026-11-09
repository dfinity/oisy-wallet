import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { Languages } from '$lib/enums/languages';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { getNoTokensMatchMessage } from '$lib/utils/modal-tokens-list.utils';
import en from '$tests/mocks/i18n.mock';

describe('modal-tokens-list.utils', () => {
	describe('getNoTokensMatchMessage', () => {
		const base = { i18n: en, language: Languages.ENGLISH };

		it.each([
			{ filters: {}, expected: 'No results' },
			{ filters: { network: BTC_MAINNET_NETWORK }, expected: 'No tokens on Bitcoin' },
			{ filters: { category: TokenCategoryTagValue.STOCK }, expected: 'No stocks found' },
			{
				filters: { category: TokenCategoryTagValue.STOCK, network: BTC_MAINNET_NETWORK },
				expected: 'No stocks on Bitcoin'
			},
			{ filters: { query: 'usdc' }, expected: 'No results for “usdc”' },
			{
				filters: { query: 'usdc', network: BTC_MAINNET_NETWORK },
				expected: 'No results for “usdc” on Bitcoin'
			},
			{
				filters: { query: 'usdc', category: TokenCategoryTagValue.STOCK },
				expected: 'No stocks match “usdc”'
			},
			{
				filters: {
					query: ' usdc ',
					category: TokenCategoryTagValue.COMPUTE,
					network: BTC_MAINNET_NETWORK
				},
				expected: 'No compute tokens on Bitcoin match “usdc”'
			}
		])('names $expected', ({ filters, expected }) => {
			expect(getNoTokensMatchMessage({ ...base, ...filters })).toBe(expected);
		});

		it('treats a blank query as no query', () => {
			expect(getNoTokensMatchMessage({ ...base, query: '   ', network: BTC_MAINNET_NETWORK })).toBe(
				'No tokens on Bitcoin'
			);
		});
	});
});
