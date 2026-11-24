import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import type * as nearIntentsEnv from '$env/rest/near-intents.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { btcSwapProviders } from '$lib/providers/btc-swap.providers';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { SwapProvider } from '$lib/types/swap';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';
import { assertNonNullish } from '@dfinity/utils';

vi.mock('$lib/services/near-intents.services', () => ({
	fetchNearIntentsSwapQuote: vi.fn(),
	nearIntentsSupportedTokens: vi.fn()
}));

describe('btc-swap.providers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Both BTC providers are on in the default env; the two cases below drop one flag each.
	it('should register Chain Fusion ahead of NEAR Intents under the default test env', () => {
		expect(btcSwapProviders.map(({ key }) => key)).toEqual([
			SwapProvider.CHAIN_FUSION,
			SwapProvider.NEAR_INTENTS
		]);
		expect(btcSwapProviders.every(({ isEnabled }) => isEnabled)).toBeTruthy();
	});

	it('should not register NEAR Intents when its BTC flag is off', async () => {
		vi.resetModules();
		vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
			...(await importOriginal<typeof nearIntentsEnv>()),
			NEAR_INTENTS_BTC_SWAP_ENABLED: false
		}));

		try {
			const { btcSwapProviders: providers } = await import('$lib/providers/btc-swap.providers');

			expect(providers.find(({ key }) => key === SwapProvider.NEAR_INTENTS)).toBeUndefined();
		} finally {
			vi.doUnmock('$env/rest/near-intents.env');
			vi.resetModules();
		}
	});

	// The backend send path defaults off in the test env, so LI.FI is left out above.
	describe('LI.FI entry', () => {
		const loadProviders = async () => {
			vi.resetModules();

			const { btcSwapProviders: providers } = await import('$lib/providers/btc-swap.providers');

			return providers;
		};

		afterEach(() => {
			btcSendViaBackend.enabled = false;
			vi.resetModules();
		});

		it('should register LI.FI last once BTC is sent through the backend', async () => {
			btcSendViaBackend.enabled = true;

			const providers = await loadProviders();

			expect(providers.map(({ key }) => key)).toEqual([
				SwapProvider.CHAIN_FUSION,
				SwapProvider.NEAR_INTENTS,
				SwapProvider.LIFI
			]);
			expect(providers.every(({ isEnabled }) => isEnabled)).toBeTruthy();
		});

		// The destinations themselves are `lifiBtcSupportedDestinations`'s, tested with its service.
		it('should list native BTC, and every EVM and Solana destination now that Relay is admitted', async () => {
			btcSendViaBackend.enabled = true;

			const lifi = (await loadProviders()).find(({ key }) => key === SwapProvider.LIFI);
			// From the same module graph as the providers: a network id is a symbol of its own module.
			const { BTC_MAINNET_TOKEN: btcToken } = await import('$env/tokens/tokens.btc.env');

			assertNonNullish(lifi);

			await expect(lifi.getSupportedTokens?.()).resolves.toEqual(
				new Set([nativeSwapTokenIdentifier({ networkId: BTC_MAINNET_NETWORK_ID, symbol: 'BTC' })])
			);
			expect(
				lifi.getSupportedDestinations({
					sourceToken: btcToken,
					supportedSourceTokens: undefined,
					findProviderSourceTokens: () => undefined
				})
			).toStrictEqual({ evm: 'any', sol: 'any' });
		});

		// `lifi-btc-swap.services` → `swap.services` → this registry → `lifi-btc-swap.services`: loaded
		// first, the service has not run yet when the registry is built, so the entry reads its
		// functions when called.
		it('should delegate to the LI.FI BTC service when that module loads first', async () => {
			btcSendViaBackend.enabled = true;
			vi.resetModules();

			const service = await import('$lib/services/lifi-btc-swap.services');
			const { btcSwapProviders: providers } = await import('$lib/providers/btc-swap.providers');
			const { BTC_MAINNET_TOKEN: btcToken } = await import('$env/tokens/tokens.btc.env');

			const lifi = providers.find(({ key }) => key === SwapProvider.LIFI);

			assertNonNullish(lifi);

			const quoteSpy = vi.spyOn(service, 'fetchLifiBtcSwapQuote').mockResolvedValue(undefined);

			const quoteParams = {
				sourceToken: btcToken,
				destinationToken: ETHEREUM_TOKEN,
				amount: 200_000n,
				userBtcAddress: mockBtcAddress,
				recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
				slippage: 0.5
			};

			await lifi.getQuote(quoteParams);

			expect(quoteSpy).toHaveBeenCalledExactlyOnceWith(quoteParams);

			await expect(lifi.getSupportedTokens?.()).resolves.toEqual(
				await service.lifiBtcSupportedTokens()
			);

			const destinationParams = {
				sourceToken: btcToken,
				supportedSourceTokens: undefined,
				findProviderSourceTokens: () => undefined
			};

			expect(lifi.getSupportedDestinations(destinationParams)).toEqual(
				service.lifiBtcSupportedDestinations(destinationParams)
			);
		});
	});

	it('should not register Chain Fusion when its flag is off', async () => {
		vi.resetModules();
		vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: false }));

		try {
			const { btcSwapProviders: providers } = await import('$lib/providers/btc-swap.providers');

			expect(providers.map(({ key }) => key)).toEqual([SwapProvider.NEAR_INTENTS]);
		} finally {
			vi.doUnmock('$env/chain-fusion-swap.env');
			vi.resetModules();
		}
	});

	describe('NEAR Intents entry', () => {
		const nearIntentsEntry = () => {
			const entry = btcSwapProviders.find(({ key }) => key === SwapProvider.NEAR_INTENTS);

			assertNonNullish(entry);

			return entry;
		};

		// Refunds go back to the user's own BTC address, so the adapter maps the
		// btc-category `userBtcAddress` onto the NEAR Intents `userAddress`.
		it('should pass userBtcAddress as userAddress to the quote', async () => {
			const params = {
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: ETHEREUM_TOKEN,
				amount: 100_000n,
				userBtcAddress: mockBtcAddress,
				recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
				slippage: 0.5
			};

			await nearIntentsEntry().getQuote(params);

			expect(fetchNearIntentsSwapQuote).toHaveBeenCalledExactlyOnceWith({
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: ETHEREUM_TOKEN,
				amount: 100_000n,
				userAddress: mockBtcAddress,
				recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
				slippage: 0.5
			});
		});

		it('should list supported tokens for the BTC mainnet network only', async () => {
			vi.mocked(nearIntentsSupportedTokens).mockResolvedValue(new Set(['btc']));

			const { getSupportedTokens } = nearIntentsEntry();

			assertNonNullish(getSupportedTokens);

			await expect(getSupportedTokens()).resolves.toEqual(new Set(['btc']));

			expect(nearIntentsSupportedTokens).toHaveBeenCalledExactlyOnceWith({
				networkIds: [BTC_MAINNET_NETWORK_ID]
			});
		});

		it('should advertise the sibling NEAR Intents categories as destinations', () => {
			const evmSet = new Set(['0xabc']);
			const solSet = new Set(['SplAddr1']);
			const btcSet = new Set([
				nativeSwapTokenIdentifier({
					networkId: BTC_MAINNET_TOKEN.network.id,
					symbol: BTC_MAINNET_TOKEN.symbol
				})
			]);

			const result = nearIntentsEntry().getSupportedDestinations({
				sourceToken: BTC_MAINNET_TOKEN,
				supportedSourceTokens: btcSet,
				findProviderSourceTokens: ({ category }) =>
					category === 'evm' ? evmSet : category === 'sol' ? solSet : undefined
			});

			expect(result).toEqual({ btc: btcSet, evm: evmSet, sol: solSet });
		});

		it('should not advertise destinations for a non-BTC source token', () => {
			const result = nearIntentsEntry().getSupportedDestinations({
				sourceToken: ETHEREUM_TOKEN,
				supportedSourceTokens: new Set(['btc']),
				findProviderSourceTokens: () => undefined
			});

			expect(result).toBeUndefined();
		});
	});
});
