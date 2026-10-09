import { XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import type * as nearIntentsEnv from '$env/rest/near-intents.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { xrpSwapProviders } from '$lib/providers/xrp-swap.providers';
import type { NetworkId } from '$lib/types/network';
import { SwapProvider, type XrpSwapProviderConfig } from '$lib/types/swap';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { assertNonNullish } from '@dfinity/utils';

// Hoisted so every evaluation of the provider module below — it is re-imported with the flag
// switched off and on — resolves to these same two mocks.
const { fetchNearIntentsSwapQuote, nearIntentsSupportedTokens } = vi.hoisted(() => ({
	fetchNearIntentsSwapQuote: vi.fn(),
	nearIntentsSupportedTokens: vi.fn()
}));

vi.mock('$lib/services/near-intents.services', () => ({
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
}));

describe('xrp-swap.providers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should register no provider while the XRP swap flag is off', async () => {
		vi.resetModules();
		vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
			...(await importOriginal<typeof nearIntentsEnv>()),
			NEAR_INTENTS_XRP_SWAP_ENABLED: false
		}));

		try {
			const { xrpSwapProviders: providers } = await import('$lib/providers/xrp-swap.providers');

			expect(providers).toEqual([]);
		} finally {
			vi.doUnmock('$env/rest/near-intents.env');
			vi.resetModules();
		}
	});

	it('should register NEAR Intents with the default env', () => {
		expect(xrpSwapProviders.map(({ key }) => key)).toEqual([SwapProvider.NEAR_INTENTS]);
	});

	describe('with the XRP swap flag on', () => {
		let nearIntentsEntry: XrpSwapProviderConfig;
		// Read from the same fresh module graph as the provider: a network id is a symbol, and
		// re-evaluating the env after `resetModules` mints a new one.
		let xrpNetworkId: NetworkId;

		beforeEach(async () => {
			vi.resetModules();
			vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
				...(await importOriginal<typeof nearIntentsEnv>()),
				NEAR_INTENTS_XRP_SWAP_ENABLED: true
			}));

			const [{ xrpSwapProviders: providers }, { XRP_MAINNET_NETWORK_ID }] = await Promise.all([
				import('$lib/providers/xrp-swap.providers'),
				import('$env/networks/networks.xrp.env')
			]);

			xrpNetworkId = XRP_MAINNET_NETWORK_ID;

			expect(providers.map(({ key }) => key)).toEqual([SwapProvider.NEAR_INTENTS]);

			const [entry] = providers;

			assertNonNullish(entry);

			nearIntentsEntry = entry;
		});

		afterEach(() => {
			vi.doUnmock('$env/rest/near-intents.env');
			vi.resetModules();
		});

		it('should register NEAR Intents as the only, enabled provider', () => {
			expect(nearIntentsEntry.isEnabled).toBeTruthy();
		});

		// The user's own XRP address is both the quote's user address and 1Click's refund address.
		it('should quote with the XRP address as the user address', async () => {
			const params = {
				sourceToken: XRP_TOKEN,
				destinationToken: ETHEREUM_TOKEN,
				amount: 10_000_000n,
				userAddress: mockXrpAddress,
				recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
				slippage: 0.5
			};

			await nearIntentsEntry.getQuote(params);

			expect(fetchNearIntentsSwapQuote).toHaveBeenCalledExactlyOnceWith(params);
		});

		it('should list supported tokens for the XRP mainnet network only', async () => {
			const xrpSet = new Set([
				nativeSwapTokenIdentifier({ networkId: XRP_MAINNET_NETWORK_ID, symbol: 'XRP' })
			]);

			vi.mocked(nearIntentsSupportedTokens).mockResolvedValue(xrpSet);

			const { getSupportedTokens } = nearIntentsEntry;

			assertNonNullish(getSupportedTokens);

			await expect(getSupportedTokens()).resolves.toEqual(xrpSet);

			expect(nearIntentsSupportedTokens).toHaveBeenCalledExactlyOnceWith({
				networkIds: [xrpNetworkId]
			});
		});

		it('should advertise the sibling NEAR Intents categories as destinations', () => {
			const evmSet = new Set(['0xabc']);
			const solSet = new Set(['SplAddr1']);
			const btcSet = new Set(['btc']);
			const xrpSet = new Set([
				nativeSwapTokenIdentifier({ networkId: XRP_MAINNET_NETWORK_ID, symbol: 'XRP' })
			]);

			const result = nearIntentsEntry.getSupportedDestinations({
				sourceToken: XRP_TOKEN,
				supportedSourceTokens: xrpSet,
				findProviderSourceTokens: ({ category }) =>
					category === 'evm'
						? evmSet
						: category === 'sol'
							? solSet
							: category === 'btc'
								? btcSet
								: undefined
			});

			expect(result).toEqual({ xrp: xrpSet, evm: evmSet, sol: solSet, btc: btcSet });
		});

		it('should not advertise destinations for a non-XRP source token', () => {
			const result = nearIntentsEntry.getSupportedDestinations({
				sourceToken: ETHEREUM_TOKEN,
				supportedSourceTokens: new Set(['xrp']),
				findProviderSourceTokens: () => undefined
			});

			expect(result).toBeUndefined();
		});
	});
});
