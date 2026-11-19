import * as onramperEnv from '$env/rest/onramper.env';
import { fetchOnramperSupportedCryptos } from '$lib/rest/onramper.rest';

describe('onramper.rest', () => {
	const apiKey = 'pk_test_onramper';

	const aave = {
		id: 'aave_ethereum',
		code: 'AAVE',
		name: 'Aave',
		symbol: 'aave',
		network: 'ethereum',
		networkDisplayName: 'Ethereum',
		decimals: 18,
		address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
		chainId: 1,
		icon: 'https://cdn.onramper.com/icons/crypto/webp/aave_ethereum.webp'
	};

	const icp = {
		id: 'icp_icp',
		code: 'ICP',
		name: 'Internet Computer',
		symbol: 'icp',
		network: 'icp',
		networkDisplayName: 'Internet Computer',
		decimals: 8,
		address: null
	};

	const mockResponse = ({ body, status = 200 }: { body: unknown; status?: number }) =>
		vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(onramperEnv, 'ONRAMPER_API_KEY', 'get').mockReturnValue(apiKey);
	});

	global.fetch = vi.fn();

	describe('fetchOnramperSupportedCryptos', () => {
		it('fetches the list of every country with the API key', async () => {
			mockResponse({ body: { message: { crypto: [aave], fiat: [] } } });

			await fetchOnramperSupportedCryptos({ type: 'sell' });

			expect(fetch).toHaveBeenCalledExactlyOnceWith(
				new URL('https://api.onramper.com/supported?type=sell&skipCountryCheck=true'),
				{
					headers: { Authorization: apiKey },
					signal: expect.any(AbortSignal)
				}
			);
		});

		it('returns the id, network and address of each token', async () => {
			mockResponse({ body: { message: { crypto: [aave, icp], fiat: [] } } });

			await expect(fetchOnramperSupportedCryptos({ type: 'buy' })).resolves.toEqual([
				{ id: 'aave_ethereum', network: 'ethereum', address: aave.address },
				{ id: 'icp_icp', network: 'icp', address: null }
			]);
		});

		it('leaves out a malformed token only', async () => {
			mockResponse({
				body: {
					message: { crypto: [{ ...aave, id: 7 }, { network: 'base' }, 'usdc', icp], fiat: [] }
				}
			});

			await expect(fetchOnramperSupportedCryptos({ type: 'buy' })).resolves.toEqual([
				{ id: 'icp_icp', network: 'icp', address: null }
			]);
		});

		it('throws when the response is not a list of tokens', async () => {
			mockResponse({ body: { message: 'Unauthorized' } });

			await expect(fetchOnramperSupportedCryptos({ type: 'buy' })).rejects.toThrow(
				'Invalid OnRamper buy list.'
			);
		});

		it('throws when the request fails', async () => {
			mockResponse({ body: { message: 'Forbidden' }, status: 403 });

			await expect(fetchOnramperSupportedCryptos({ type: 'buy' })).rejects.toThrow(
				'Fetching the OnRamper buy list failed with status 403.'
			);
		});

		it('makes no request without an API key', async () => {
			vi.spyOn(onramperEnv, 'ONRAMPER_API_KEY', 'get').mockReturnValue(undefined);

			await expect(fetchOnramperSupportedCryptos({ type: 'buy' })).rejects.toThrow(
				'No OnRamper API key.'
			);

			expect(fetch).not.toHaveBeenCalled();
		});
	});
});
