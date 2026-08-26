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
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { assertNonNullish } from '@dfinity/utils';

vi.mock('$lib/services/near-intents.services', () => ({
	fetchNearIntentsSwapQuote: vi.fn(),
	nearIntentsSupportedTokens: vi.fn()
}));

describe('btc-swap.providers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The vitest env maps to LOCAL: the NEAR Intents BTC flag is on while Chain Fusion
	// (STAGING-gated) is off.
	it('should register NEAR Intents as the only provider under the default test env', () => {
		expect(btcSwapProviders).toHaveLength(1);
		expect(btcSwapProviders[0].key).toBe(SwapProvider.NEAR_INTENTS);
		expect(btcSwapProviders[0].isEnabled).toBeTruthy();
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

	it('should register Chain Fusion ahead of NEAR Intents when both flags are on', async () => {
		vi.resetModules();
		vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: true }));

		try {
			const { btcSwapProviders: providers } = await import('$lib/providers/btc-swap.providers');

			expect(providers.map(({ key }) => key)).toEqual([
				SwapProvider.CHAIN_FUSION,
				SwapProvider.NEAR_INTENTS
			]);
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
			const btcSet = new Set(['btc']);

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
