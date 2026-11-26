import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import { ZERO } from '$lib/constants/app.constants';
import { RIFT_QUOTE_REFRESH_INTERVAL_MS } from '$lib/constants/swap.constants';
import { postRiftQuote } from '$lib/rest/rift.rest';
import {
	fetchRiftBtcSwapQuote,
	resetRiftQuoteCache,
	riftBtcSupportedDestinations,
	riftBtcSupportedTokens
} from '$lib/services/rift-swap.services';
import { RiftApiError } from '$lib/types/errors';
import type { RiftQuote } from '$lib/types/rift';
import { SwapProvider, type BtcQuoteParams } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockRiftQuote, mockRiftQuoteRequest } from '$tests/mocks/rift.mock';

vi.mock('$lib/rest/rift.rest', () => ({
	postRiftQuote: vi.fn()
}));

const USDC_ETHEREUM: Erc20Token = {
	...mockValidErc20Token,
	address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

describe('rift-swap.services', () => {
	describe('riftBtcSupportedTokens', () => {
		it('lists native BTC on mainnet only', async () => {
			await expect(riftBtcSupportedTokens()).resolves.toEqual(
				new Set([resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier])
			);
		});
	});

	describe('riftBtcSupportedDestinations', () => {
		const destinations = (sourceToken: Token) =>
			riftBtcSupportedDestinations({
				sourceToken,
				supportedSourceTokens: undefined,
				findProviderSourceTokens: () => undefined
			});

		it('reaches every EVM token from native BTC on mainnet', () => {
			expect(destinations(BTC_MAINNET_TOKEN)).toEqual({ evm: 'any' });
		});

		it.each([
			{ label: 'BTC on testnet', token: BTC_TESTNET_TOKEN },
			{ label: 'ETH', token: ETHEREUM_TOKEN }
		])('reaches nothing from $label', ({ token }) => {
			expect(destinations(token)).toBeUndefined();
		});
	});

	describe('fetchRiftBtcSwapQuote', () => {
		const params = (overrides: Partial<BtcQuoteParams> = {}): BtcQuoteParams => ({
			sourceToken: BTC_MAINNET_TOKEN,
			destinationToken: USDC_ETHEREUM,
			amount: 200_000n,
			userBtcAddress: mockBtcAddress,
			recipientAddress: mockEthAddress,
			slippage: 0.5,
			...overrides
		});

		const answer = (quote: RiftQuote = mockRiftQuote) =>
			vi.mocked(postRiftQuote).mockResolvedValue(quote);

		beforeEach(() => {
			vi.clearAllMocks();
			resetRiftQuoteCache();

			vi.useFakeTimers();
			// Five minutes before the live quote expires.
			vi.setSystemTime(Date.parse(mockRiftQuote.expires_at) - 5 * 60_000);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("asks for a raw, fast quote under OISY's integrator id and offers its estimate", async () => {
			answer();

			const offer = await fetchRiftBtcSwapQuote(params());

			expect(postRiftQuote).toHaveBeenCalledExactlyOnceWith(mockRiftQuoteRequest);
			expect(offer).toStrictEqual({
				provider: SwapProvider.RIFT,
				receiveAmount: 121_475_958n,
				swapDetails: mockRiftQuote
			});
		});

		// Rift executes at whatever price it finds once the deposit arrives.
		it('offers no minimum, whatever the slippage', async () => {
			answer();

			const offer = await fetchRiftBtcSwapQuote(params({ slippage: 3 }));

			expect(offer).not.toHaveProperty('receiveOutMinimum');
		});

		it('reports that Rift takes part', async () => {
			answer();
			const onProviderParticipating = vi.fn();

			await fetchRiftBtcSwapQuote(params({ onProviderParticipating }));

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.RIFT);
		});

		it.each([
			{ label: 'BTC to BTC', overrides: { destinationToken: BTC_MAINNET_TOKEN } },
			{ label: 'a token on BSC', overrides: { destinationToken: BNB_MAINNET_TOKEN } },
			{ label: 'SOL', overrides: { destinationToken: SOLANA_TOKEN } },
			{ label: 'BTC on testnet', overrides: { sourceToken: BTC_TESTNET_TOKEN } },
			{ label: 'an EVM source', overrides: { sourceToken: ETHEREUM_TOKEN } },
			{ label: 'a zero amount', overrides: { amount: ZERO } }
		])('does not ask Rift about $label', async ({ overrides }) => {
			const onProviderParticipating = vi.fn();

			await expect(
				fetchRiftBtcSwapQuote(params({ ...overrides, onProviderParticipating }))
			).resolves.toBeUndefined();

			expect(postRiftQuote).not.toHaveBeenCalled();
			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('offers nothing when Rift has no route', async () => {
			vi.mocked(postRiftQuote).mockRejectedValue(
				new RiftApiError({ status: 422, message: 'no route' })
			);

			await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeUndefined();
		});

		it('offers nothing for a quote that does not answer the request', async () => {
			answer({ ...mockRiftQuote, amount_in: '100000' });

			await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeUndefined();
		});

		describe('cadence', () => {
			it('answers unchanged inputs from the last quote until the refresh interval has passed', async () => {
				answer();

				await fetchRiftBtcSwapQuote(params());
				await vi.advanceTimersByTimeAsync(RIFT_QUOTE_REFRESH_INTERVAL_MS - 1);
				const cached = await fetchRiftBtcSwapQuote(params());

				expect(postRiftQuote).toHaveBeenCalledOnce();
				expect(cached?.receiveAmount).toBe(121_475_958n);

				await vi.advanceTimersByTimeAsync(1);
				await fetchRiftBtcSwapQuote(params());

				expect(postRiftQuote).toHaveBeenCalledTimes(2);
			});

			it('asks again at once when the inputs change', async () => {
				answer();

				await fetchRiftBtcSwapQuote(params());
				await fetchRiftBtcSwapQuote(params({ amount: 300_000n }));

				expect(postRiftQuote).toHaveBeenCalledTimes(2);
				expect(postRiftQuote).toHaveBeenLastCalledWith({
					...mockRiftQuoteRequest,
					amount_in: '300000'
				});
			});

			it('shares a request that has not been answered yet', async () => {
				const { promise, resolve } = Promise.withResolvers<RiftQuote>();
				vi.mocked(postRiftQuote).mockReturnValue(promise);

				const first = fetchRiftBtcSwapQuote(params());
				const second = fetchRiftBtcSwapQuote(params());

				resolve(mockRiftQuote);

				const offers = await Promise.all([first, second]);

				expect(postRiftQuote).toHaveBeenCalledOnce();
				expect(offers.map((offer) => offer?.receiveAmount)).toEqual([121_475_958n, 121_475_958n]);
			});

			it('keeps no offer for the interval too', async () => {
				vi.mocked(postRiftQuote).mockRejectedValue(
					new RiftApiError({ status: 422, message: 'no route' })
				);

				await fetchRiftBtcSwapQuote(params());
				await fetchRiftBtcSwapQuote(params());

				expect(postRiftQuote).toHaveBeenCalledOnce();
			});

			// The cache keeps the answer, and its checks run on every read.
			it('drops a kept quote once it has expired', async () => {
				answer({ ...mockRiftQuote, expires_at: new Date(Date.now() + 10_000).toISOString() });

				await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeDefined();

				await vi.advanceTimersByTimeAsync(10_000);

				await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeUndefined();
				expect(postRiftQuote).toHaveBeenCalledOnce();
			});
		});
	});
});
