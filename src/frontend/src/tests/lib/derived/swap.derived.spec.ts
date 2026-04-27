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
import { isPageTokenSwappable, swappableTokens } from '$lib/derived/swap.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { bn2Bi } from '$tests/mocks/balances.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
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

		it('should return false for Bitcoin token', () => {
			mockPage.mockToken(BTC_MAINNET_TOKEN);

			expect(get(isPageTokenSwappable)).toBeFalsy();
		});

		it('should update reactively when switching between swappable and non-swappable tokens', () => {
			mockPage.mockToken(SOLANA_TOKEN);

			expect(get(isPageTokenSwappable)).toBeTruthy();

			mockPage.mockToken(BTC_MAINNET_TOKEN);

			expect(get(isPageTokenSwappable)).toBeFalsy();
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
					icp: { coverage: 'none', supportedTokenIds: new Set() },
					evm: { coverage: 'none', supportedTokenIds: new Set() },
					sol: { coverage: 'all', supportedTokenIds: new Set(['some-other-token']) }
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();
			});

			it('should return true when token is in universe and supported by providers', () => {
				mockPage.mockToken(SOLANA_TOKEN);

				swapSupportedTokensStore.set({
					icp: { coverage: 'none', supportedTokenIds: new Set() },
					evm: { coverage: 'none', supportedTokenIds: new Set() },
					sol: {
						coverage: 'all',
						supportedTokenIds: new Set([SOLANA_TOKEN.symbol.toLowerCase()])
					}
				});

				expect(get(isPageTokenSwappable)).toBeTruthy();
			});

			it('should return true for ETH token when EVM providers have no list', () => {
				mockPage.mockToken(ETHEREUM_TOKEN);

				swapSupportedTokensStore.set({
					icp: { coverage: 'none', supportedTokenIds: new Set() },
					evm: { coverage: 'none', supportedTokenIds: new Set() },
					sol: { coverage: 'all', supportedTokenIds: new Set() }
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
						icp: { coverage: 'none', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: { coverage: 'all', supportedTokenIds: new Set(['different-address']) }
					});
					return () => {};
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();
			});

			it('should update reactively when provider data loads', () => {
				mockPage.mockToken(SOLANA_TOKEN);

				expect(get(isPageTokenSwappable)).toBeTruthy();

				swapSupportedTokensStore.set({
					icp: { coverage: 'none', supportedTokenIds: new Set() },
					evm: { coverage: 'none', supportedTokenIds: new Set() },
					sol: { coverage: 'all', supportedTokenIds: new Set(['not-sol']) }
				});

				expect(get(isPageTokenSwappable)).toBeFalsy();

				swapSupportedTokensStore.set({
					icp: { coverage: 'none', supportedTokenIds: new Set() },
					evm: { coverage: 'none', supportedTokenIds: new Set() },
					sol: {
						coverage: 'all',
						supportedTokenIds: new Set([SOLANA_TOKEN.symbol.toLowerCase()])
					}
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
});
