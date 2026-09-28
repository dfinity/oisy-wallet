import { COINGECKO_API_URL } from '$env/rest/coingecko.env';
import { Currency } from '$lib/enums/currency';
import { simplePrice } from '$lib/rest/coingecko.rest';

describe('coingecko.rest', () => {
	global.fetch = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ bitcoin: { usd: 1 } })
		} as unknown as Response);
	});

	describe('simplePrice', () => {
		it('joins a list of vs_currencies with commas', async () => {
			await simplePrice({
				ids: 'bitcoin',
				vs_currencies: [Currency.USD, Currency.EUR, Currency.GBP],
				include_24hr_change: true
			});

			expect(fetch).toHaveBeenCalledExactlyOnceWith(
				`${COINGECKO_API_URL}simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp&include_24hr_change=true`,
				expect.anything()
			);
		});

		it('passes a comma-separated vs_currencies string unchanged', async () => {
			await simplePrice({ ids: 'bitcoin', vs_currencies: `${Currency.USD},${Currency.JPY}` });

			expect(fetch).toHaveBeenCalledExactlyOnceWith(
				`${COINGECKO_API_URL}simple/price?ids=bitcoin&vs_currencies=usd,jpy`,
				expect.anything()
			);
		});
	});
});
