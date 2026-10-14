import type * as lifiEnv from '$env/rest/lifi.env';
import { LIFI_QUOTE_TIMEOUT_MS } from '$lib/constants/swap.constants';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { mockLifiQuote } from '$tests/mocks/lifi.mock';
import type * as lifiSdk from '@lifi/sdk';
import { createClient, getQuote, type QuoteRequestFromAmount, type SDKClient } from '@lifi/sdk';

vi.mock('$env/rest/lifi.env', async (importOriginal) => ({
	...(await importOriginal<typeof lifiEnv>()),
	LIFI_INTEGRATOR: 'oisy-test',
	LIFI_API_KEY: 'test-api-key'
}));

vi.mock('@lifi/sdk', async (importOriginal) => ({
	...(await importOriginal<typeof lifiSdk>()),
	createClient: vi.fn(),
	getQuote: vi.fn()
}));

describe('lifi.rest', () => {
	const client = { config: {} } as SDKClient;

	const request: QuoteRequestFromAmount = {
		fromChain: 8453,
		toChain: 8453,
		fromToken: '0x0000000000000000000000000000000000000000',
		toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
		fromAddress: '0x000000000000000000000000000000000000dEaD',
		fromAmount: '10000000000000000'
	};

	beforeEach(() => {
		vi.mocked(createClient).mockReturnValue(client);
		vi.mocked(getQuote).mockResolvedValue(mockLifiQuote);
	});

	it('should create the client on first use only, with the version check and chain preload off', async () => {
		expect(createClient).not.toHaveBeenCalled();

		await expect(fetchLifiQuote(request)).resolves.toBe(mockLifiQuote);

		await fetchLifiQuote(request);

		expect(createClient).toHaveBeenCalledExactlyOnceWith({
			integrator: 'oisy-test',
			apiKey: 'test-api-key',
			disableVersionCheck: true,
			preloadChains: false
		});
		expect(getQuote).toHaveBeenCalledWith(client, request, { signal: expect.any(AbortSignal) });
	});

	it('should give every quote request the quote deadline', async () => {
		// The signal is substituted rather than waited out: vitest's fake timers do not drive
		// `AbortSignal.timeout`.
		const { signal } = new AbortController();
		const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);

		await fetchLifiQuote(request);

		expect(timeout).toHaveBeenCalledExactlyOnceWith(LIFI_QUOTE_TIMEOUT_MS);
		expect(getQuote).toHaveBeenLastCalledWith(client, request, { signal });

		timeout.mockRestore();
	});
});
