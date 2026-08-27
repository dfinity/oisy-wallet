import type * as nearIntentsEnv from '$env/rest/near-intents.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import { ZERO } from '$lib/constants/app.constants';
import {
	allCrossChainSwapTokens,
	allSwapCompatibleIcrcTokens
} from '$lib/derived/all-tokens.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import {
	allSwapUniverseTokens,
	isPageTokenSwappable,
	swappableTokens
} from '$lib/derived/swap.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { bn2Bi } from '$tests/mocks/balances.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('swap.derived', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		swapSupportedTokensStore.reset();
	});

	describe('isPageTokenSwappable', () => {
		beforeEach(() => {
			mockPage.reset();
		});

		it('should return false when no page token is set', () => {
			expect(get(isPageTokenSwappable)).toBeFalsy();
		});

		it('should return true for ICP token', () => {
			mockPage.mockToken(ICP_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();
		});

		it('should return true for Ethereum token', () => {
			mockPage.mockToken(ETHEREUM_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();
		});

		it('should return true for Solana token', () => {
			mockPage.mockToken(SOLANA_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();
		});

		// The vitest env maps to LOCAL, where the NEAR Intents BTC flag opens Bitcoin.
		it('should return true for Bitcoin token', () => {
			mockPage.mockToken(BTC_MAINNET_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();
		});

		it('should update reactively when switching between swappable and non-swappable tokens', () => {
			mockPage.mockToken(SOLANA_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();

			mockPage.reset();

			expect(get(isPageTokenSwappable)).toBeFalsy();

			mockPage.mockToken(BTC_MAINNET_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();
		});

		it('should return false after resetting the page', () => {
			mockPage.mockToken(ETHEREUM_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();

			mockPage.reset();

			expect(get(isPageTokenSwappable)).toBeFalsy();
		});

		describe('with custom tokens', () => {
			it('should return true for an SPL token in the swap universe', () => {
				const splToken: SplCustomToken = { ...mockValidSplToken, enabled: true };

				vi.spyOn(pageToken, 'subscribe').mockImplementation((fn) => {
					fn(splToken);
					return () => {};
				});

				vi.spyOn(allCrossChainSwapTokens, 'subscribe').mockImplementation((fn) => {
					fn([splToken]);
					return () => {};
				});

				vi.spyOn(allSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
					fn([]);
					return () => {};
				});

				expect(get(isPageTokenSwappable)).toBeTruthy();
			});

			it('should return true for an ERC20 token in the swap universe', () => {
				const erc20Token: Erc20CustomToken = { ...mockValidErc20Token, enabled: true };

				vi.spyOn(pageToken, 'subscribe').mockImplementation((fn) => {
					fn(erc20Token);
					return () => {};
				});

				vi.spyOn(allCrossChainSwapTokens, 'subscribe').mockImplementation((fn) => {
					fn([erc20Token]);
					return () => {};
				});

				vi.spyOn(allSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
					fn([]);
					return () => {};
				});

				expect(get(isPageTokenSwappable)).toBeTruthy();
			});

			it('should return false for a token not in the swap universe', () => {
				const splToken: SplCustomToken = { ...mockValidSplToken, enabled: true };

				vi.spyOn(pageToken, 'subscribe').mockImplementation((fn) => {
					fn(splToken);
					return () => {};
				});

				vi.spyOn(allCrossChainSwapTokens, 'subscribe').mockImplementation((fn) => {
					fn([]);
					return () => {};
				});

				vi.spyOn(allSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
					fn([]);
					return () => {};
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();
			});
		});

		describe('with provider supported data', () => {
			it('should return false when token is in universe but not supported by providers', () => {
				mockPage.mockToken(SOLANA_TOKEN);

				swapSupportedTokensStore.set({
					aggregated: {
						icp: { coverage: 'none', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: { coverage: 'all', supportedTokenIds: new Set(['some-other-token']) },
						btc: { coverage: 'none', supportedTokenIds: new Set() }
					},
					providers: []
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();
			});

			it('should return true when token is in universe and supported by providers', () => {
				mockPage.mockToken(SOLANA_TOKEN);

				swapSupportedTokensStore.set({
					aggregated: {
						icp: { coverage: 'none', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: {
							coverage: 'all',
							supportedTokenIds: new Set([SOLANA_TOKEN.symbol.toLowerCase()])
						},
						btc: { coverage: 'none', supportedTokenIds: new Set() }
					},
					providers: []
				});

				expect(get(isPageTokenSwappable)).toBeTruthy();
			});

			it('should return true for ETH token when EVM providers have no list', () => {
				mockPage.mockToken(ETHEREUM_TOKEN);

				swapSupportedTokensStore.set({
					aggregated: {
						icp: { coverage: 'none', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: { coverage: 'all', supportedTokenIds: new Set() },
						btc: { coverage: 'none', supportedTokenIds: new Set() }
					},
					providers: []
				});

				expect(get(isPageTokenSwappable)).toBeTruthy();
			});

			it('should return false for SPL token not in provider supported set', () => {
				const splToken: SplCustomToken = { ...mockValidSplToken, enabled: true };

				vi.spyOn(pageToken, 'subscribe').mockImplementation((fn) => {
					fn(splToken);
					return () => {};
				});

				vi.spyOn(allCrossChainSwapTokens, 'subscribe').mockImplementation((fn) => {
					fn([splToken]);
					return () => {};
				});

				vi.spyOn(allSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
					fn([]);
					return () => {};
				});

				vi.spyOn(swapSupportedTokensStore, 'subscribe').mockImplementation((fn) => {
					fn({
						aggregated: {
							icp: { coverage: 'none', supportedTokenIds: new Set() },
							evm: { coverage: 'none', supportedTokenIds: new Set() },
							sol: { coverage: 'all', supportedTokenIds: new Set(['different-address']) },
							btc: { coverage: 'none', supportedTokenIds: new Set() }
						},
						providers: []
					});
					return () => {};
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();
			});

			it('should update reactively when provider data loads', () => {
				mockPage.mockToken(SOLANA_TOKEN);

				expect(get(isPageTokenSwappable)).toBeTruthy();

				swapSupportedTokensStore.set({
					aggregated: {
						icp: { coverage: 'none', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: { coverage: 'all', supportedTokenIds: new Set(['not-sol']) },
						btc: { coverage: 'none', supportedTokenIds: new Set() }
					},
					providers: []
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();

				swapSupportedTokensStore.set({
					aggregated: {
						icp: { coverage: 'none', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: {
							coverage: 'all',
							supportedTokenIds: new Set([SOLANA_TOKEN.symbol.toLowerCase()])
						},
						btc: { coverage: 'none', supportedTokenIds: new Set() }
					},
					providers: []
				});

				expect(get(isPageTokenSwappable)).toBeTruthy();
			});
		});
	});

	describe('swappableTokens', () => {
		it('should return undefined for sourceToken and destinationToken', () => {
			const tokens = get(swappableTokens);

			expect(tokens.sourceToken).toBeUndefined();
			expect(tokens.destinationToken).toBeUndefined();
		});

		it('should return selected token as sourceToken and undefined for destinationToken', () => {
			mockPage.mockToken(ICP_TOKEN);

			balancesStore.set({
				id: ICP_TOKEN_ID,
				data: { data: bn2Bi, certified: true }
			});

			const tokens = get(swappableTokens);

			expect(tokens.sourceToken).toEqual({ ...ICP_TOKEN, enabled: true });
			expect(tokens.destinationToken).toBeUndefined();
		});

		it('should return selected token as destinationToken and undefined for sourceToken', () => {
			mockPage.mockToken(ICP_TOKEN);

			balancesStore.set({
				id: ICP_TOKEN_ID,
				data: { data: ZERO, certified: true }
			});

			const tokens = get(swappableTokens);

			expect(tokens.sourceToken).toBeUndefined();
			expect(tokens.destinationToken).toEqual({ ...ICP_TOKEN, enabled: true });
		});

		it('should return selected ETH token as sourceToken and undefined for destinationToken', () => {
			mockPage.mockToken(ETHEREUM_TOKEN);

			balancesStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: { data: bn2Bi, certified: true }
			});

			const tokens = get(swappableTokens);

			expect(tokens.sourceToken).toEqual({ ...ETHEREUM_TOKEN, enabled: true });
			expect(tokens.destinationToken).toBeUndefined();
		});

		it('should return selected ETH token as destinationToken and undefined for sourceToken', () => {
			mockPage.mockToken(ETHEREUM_TOKEN);

			balancesStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: { data: ZERO, certified: true }
			});

			const tokens = get(swappableTokens);

			expect(tokens.sourceToken).toBeUndefined();
			expect(tokens.destinationToken).toEqual({ ...ETHEREUM_TOKEN, enabled: true });
		});
	});

	// Bitcoin joins the swap universe only when a provider can move it: Chain Fusion or
	// NEAR Intents. It is kept out of `allCrossChainSwapTokens`, which is typed around
	// the EVM / SOL custom-token unions.
	describe('allSwapUniverseTokens', () => {
		beforeEach(() => {
			setupUserNetworksStore('allEnabled');
		});

		// The vitest env maps to LOCAL, where the NEAR Intents BTC flag is on while
		// Chain Fusion (STAGING-gated) is off.
		it('should include the enabled mainnet Bitcoin token via the NEAR Intents BTC flag', () => {
			const result = get(allSwapUniverseTokens);

			expect(result.find(({ id }) => id === BTC_MAINNET_TOKEN.id)).toEqual({
				...BTC_MAINNET_TOKEN,
				enabled: true
			});
		});

		it('should exclude Bitcoin while no provider reaches it', async () => {
			vi.resetModules();
			vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
				...(await importOriginal<typeof nearIntentsEnv>()),
				NEAR_INTENTS_BTC_SWAP_ENABLED: false
			}));

			try {
				const [
					{ allSwapUniverseTokens: universe },
					{ setupUserNetworksStore: setupNetworks },
					{ setupTestnetsStore: setupTestnets },
					{ BTC_MAINNET_TOKEN: bitcoin }
				] = await Promise.all([
					import('$lib/derived/swap.derived'),
					import('$tests/utils/user-networks.test-utils'),
					import('$tests/utils/testnets.test-utils'),
					import('$env/tokens/tokens.btc.env')
				]);

				setupTestnets('reset');
				setupNetworks('allEnabled');

				const result = get(universe);

				expect(result.find(({ id }) => id === bitcoin.id)).toBeUndefined();
			} finally {
				vi.doUnmock('$env/rest/near-intents.env');
				vi.resetModules();
			}
		});

		it('should include the enabled mainnet Bitcoin token when only Chain Fusion is on', async () => {
			vi.resetModules();
			vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: true }));
			vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
				...(await importOriginal<typeof nearIntentsEnv>()),
				NEAR_INTENTS_BTC_SWAP_ENABLED: false
			}));

			try {
				const [
					{ allSwapUniverseTokens: universe },
					{ setupUserNetworksStore: setupNetworks },
					{ setupTestnetsStore: setupTestnets },
					{ BTC_MAINNET_TOKEN: bitcoin, BTC_TESTNET_TOKEN: bitcoinTestnet }
				] = await Promise.all([
					import('$lib/derived/swap.derived'),
					import('$tests/utils/user-networks.test-utils'),
					import('$tests/utils/testnets.test-utils'),
					import('$env/tokens/tokens.btc.env')
				]);

				setupTestnets('reset');
				setupNetworks('allEnabled');

				const result = get(universe);

				expect(result.find(({ id }) => id === bitcoin.id)).toEqual({
					...bitcoin,
					enabled: true
				});
				expect(result.find(({ id }) => id === bitcoinTestnet.id)).toBeUndefined();
			} finally {
				vi.doUnmock('$env/chain-fusion-swap.env');
				vi.doUnmock('$env/rest/near-intents.env');
				vi.resetModules();
			}
		});
	});
});
