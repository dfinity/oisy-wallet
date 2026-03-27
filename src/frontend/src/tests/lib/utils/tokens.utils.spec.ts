import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK, ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import {
	BTC_MAINNET_SYMBOL,
	BTC_MAINNET_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import * as appConstants from '$lib/constants/app.constants';
import { ZERO } from '$lib/constants/app.constants';
import { saveCustomTokensWithKey } from '$lib/services/manage-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Network } from '$lib/types/network';
import type { StakeBalances } from '$lib/types/stake-balance';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import type { UserNetworks } from '$lib/types/user-networks';
import { usdValue } from '$lib/utils/exchange.utils';
import { mapTokenUi } from '$lib/utils/token.utils';
import {
	assertExistingTokens,
	defineEnabledTokens,
	filterEnabledTokens,
	filterTokens,
	filterTokensByNft,
	findPutativeToken,
	findToken,
	getCodebaseTokenIconPath,
	pinEnabledTokensAtTop,
	saveAllCustomTokens,
	sortTokens,
	sumMainnetTokensUsdBalancesPerNetwork,
	sumMainnetTokensUsdStakeBalancesPerNetwork,
	sumTokensUiUsdBalance,
	sumTokensUiUsdStakeBalance,
	tokenListEqual
} from '$lib/utils/tokens.utils';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { bn1Bi, bn2Bi, bn3Bi, certified, mockBalances } from '$tests/mocks/balances.mock';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { createMockErc20Tokens, mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockExchanges, mockOneUsd } from '$tests/mocks/exchanges.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import i18nMock from '$tests/mocks/i18n.mock';
import {
	mockIndexCanisterId,
	mockValidDip20Token,
	mockValidIcCkToken,
	mockValidIcrcToken,
	mockValidIcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockTokens, mockValidToken } from '$tests/mocks/tokens.mock';

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

vi.mock('$lib/stores/toasts.store', () => ({
	toastsError: vi.fn(),
	toastsShow: vi.fn()
}));

describe('tokens.utils', () => {
	describe('sortTokens', () => {
		const mockUsdValue = vi.mocked(usdValue);

		const mockStakeBalances: StakeBalances = {};

		beforeEach(() => {
			vi.clearAllMocks();

			mockUsdValue.mockImplementation(
				({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
			);
		});

		it('should sort by USD balance (descending)', () => {
			const tokens = mockTokens.map((token) =>
				mapTokenUi({
					token,
					$balances: mockBalances,
					$stakeBalances: mockStakeBalances,
					$exchanges: mockExchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([
				ETHEREUM_TOKEN.id,
				BTC_MAINNET_TOKEN.id,
				ICP_TOKEN.id
			]);
		});

		it('should apply pinning only after USD balance tie, preserving pin order', () => {
			const zeroBalances: CertifiedStoreData<BalancesData> = {
				[ICP_TOKEN.id]: { data: ZERO, certified },
				[BTC_MAINNET_TOKEN.id]: { data: ZERO, certified },
				[ETHEREUM_TOKEN.id]: { data: ZERO, certified }
			};

			const tokens = mockTokens.map((token) =>
				mapTokenUi({
					token,
					$balances: zeroBalances,
					$stakeBalances: mockStakeBalances,
					$exchanges: mockExchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [ETHEREUM_TOKEN, BTC_MAINNET_TOKEN],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([
				ETHEREUM_TOKEN.id,
				BTC_MAINNET_TOKEN.id,
				ICP_TOKEN.id
			]);
		});

		it('should prioritise tokens with non-zero native/unit balance when USD balance is tied at 0', () => {
			const tokenHasBalance: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-HAS-BAL'),
				symbol: 'AAA',
				name: 'Has balance',
				network: ICP_NETWORK
			};

			const tokenZeroBalance: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-ZERO-BAL'),
				symbol: 'BBB',
				name: 'Zero balance',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenHasBalance.id]: { data: 2n, certified },
				[tokenZeroBalance.id]: { data: ZERO, certified }
			};

			// Force USD balance = 0 for both, regardless of native balance.
			const $exchanges: ExchangesData = {
				[tokenHasBalance.id]: { usd: 0, usd_market_cap: 0 },
				[tokenZeroBalance.id]: { usd: 0, usd_market_cap: 0 }
			};

			const tokens = [tokenZeroBalance, tokenHasBalance].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenHasBalance.id, tokenZeroBalance.id]);
		});

		it('should not let pinning override the "has any balance" rule when both USD balances are 0', () => {
			const tokenHasBalance: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-HAS-BAL-PIN-TEST'),
				symbol: 'AAA',
				name: 'Has balance',
				network: ICP_NETWORK
			};

			const tokenZeroBalancePinned: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-ZERO-BAL-PINNED'),
				symbol: 'BBB',
				name: 'Zero balance (pinned)',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenHasBalance.id]: { data: 1n, certified },
				[tokenZeroBalancePinned.id]: { data: ZERO, certified }
			};

			// Force USD balance = 0 for both.
			const $exchanges: ExchangesData = {
				[tokenHasBalance.id]: { usd: 0, usd_market_cap: 0 },
				[tokenZeroBalancePinned.id]: { usd: 0, usd_market_cap: 0 }
			};

			const tokens = [tokenZeroBalancePinned, tokenHasBalance].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [tokenZeroBalancePinned], // pinned, but should still come after the token with balance
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenHasBalance.id, tokenZeroBalancePinned.id]);
		});

		it('should not let pinning override a higher USD balance', () => {
			const tokens = mockTokens.map((token) =>
				mapTokenUi({
					token,
					$balances: mockBalances,
					$stakeBalances: mockStakeBalances,
					$exchanges: mockExchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [ICP_TOKEN],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([
				ETHEREUM_TOKEN.id,
				BTC_MAINNET_TOKEN.id,
				ICP_TOKEN.id
			]);
		});

		it('should sort deprecated IC tokens at the end (even if they have high USD balance or are pinned)', () => {
			const mockDeprecatedToken: IcToken = { ...mockValidIcToken, deprecated: true };

			const balancesWithDeprecated: CertifiedStoreData<BalancesData> = {
				...mockBalances,
				[mockDeprecatedToken.id]: { data: 999n, certified }
			};

			const exchangesWithDeprecated: ExchangesData = {
				...mockExchanges,
				[mockDeprecatedToken.id]: { usd: mockOneUsd }
			};

			const tokens = [mockDeprecatedToken, ...mockTokens].map((token) =>
				mapTokenUi({
					token,
					$balances: balancesWithDeprecated,
					$stakeBalances: mockStakeBalances,
					$exchanges: exchangesWithDeprecated
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [mockDeprecatedToken],
				$networksToPin: []
			});

			expect(result.at(-1)?.id).toBe(mockDeprecatedToken.id);
		});

		it('should sort by symbol (ascending) when USD balance is tied and unpinned', () => {
			const tokenSymbolA: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-SYM-A'),
				symbol: 'AAA',
				name: 'Zulu',
				network: { ...ICP_NETWORK, name: 'A Network' }
			};

			const tokenSymbolZ: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-SYM-Z'),
				symbol: 'ZZZ',
				name: 'Alpha',
				network: { ...ICP_NETWORK, name: 'B Network' }
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenSymbolA.id]: { data: ZERO, certified },
				[tokenSymbolZ.id]: { data: ZERO, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenSymbolA.id]: { usd_market_cap: 1, usd: 0 },
				[tokenSymbolZ.id]: { usd_market_cap: 999, usd: 0 }
			};

			const tokens = [tokenSymbolZ, tokenSymbolA].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenSymbolA.id, tokenSymbolZ.id]);
		});

		it('should sort by symbol, then name, then network name, then balance, then market cap when USD balance is tied and unpinned', () => {
			const NETWORK_A = { ...ICP_NETWORK, name: 'A Network' };
			const NETWORK_B = { ...ICP_NETWORK, name: 'B Network' };

			const tokenA: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-A'),
				symbol: 'AAA',
				name: 'Alpha',
				network: NETWORK_A
			};
			const tokenB: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-B'),
				symbol: 'AAA',
				name: 'Alpha',
				network: NETWORK_B
			};
			const tokenC: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-C'),
				symbol: 'BBB',
				name: 'Beta',
				network: NETWORK_A
			};
			const tokenD: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-D'),
				symbol: 'BBB',
				name: 'Beta',
				network: NETWORK_A
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenA.id]: { data: 1n, certified },
				[tokenB.id]: { data: 1n, certified },
				[tokenC.id]: { data: 2n, certified },
				[tokenD.id]: { data: 1n, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenA.id]: { usd_market_cap: 10, usd: 0 },
				[tokenB.id]: { usd_market_cap: 20, usd: 0 },
				[tokenC.id]: { usd_market_cap: 1, usd: 0 },
				[tokenD.id]: { usd_market_cap: 999, usd: 0 }
			};

			const tokens = [tokenD, tokenB, tokenC, tokenA].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenA.id, tokenB.id, tokenC.id, tokenD.id]);
		});

		it('should sort tokens with same name by network name (locale-aware) before balance/market cap', () => {
			const tokenA: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-N1'),
				symbol: 'SAME',
				name: 'SameName',
				network: { ...ICP_NETWORK, name: 'A Network' }
			};
			const tokenB: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-N2'),
				symbol: 'SAME',
				name: 'SameName',
				network: { ...ICP_NETWORK, name: 'B Network' }
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenA.id]: { data: ZERO, certified },
				[tokenB.id]: { data: ZERO, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenA.id]: { usd_market_cap: 999, usd: 0 },
				[tokenB.id]: { usd_market_cap: 1, usd: 0 }
			};

			const tokens = [tokenB, tokenA].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenA.id, tokenB.id]);
		});

		it('should sort by balance (descending) before market cap when name and network are tied', () => {
			const tokenHighBalanceLowMcap: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-BAL1'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};
			const tokenLowBalanceHighMcap: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-BAL2'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};
			const tokenZeroBalanceHighMcap: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-BAL0'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};
			const tokenNoBalanceHighMcap: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-NOBAL'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenHighBalanceLowMcap.id]: { data: 2n, certified },
				[tokenLowBalanceHighMcap.id]: { data: 1n, certified },
				[tokenZeroBalanceHighMcap.id]: { data: ZERO, certified },
				[tokenNoBalanceHighMcap.id]: null
			};

			const $exchanges: ExchangesData = {
				[tokenHighBalanceLowMcap.id]: { usd_market_cap: 1, usd: 0 },
				[tokenLowBalanceHighMcap.id]: { usd_market_cap: 999, usd: 0 }
			};

			const tokens = [
				tokenNoBalanceHighMcap,
				tokenZeroBalanceHighMcap,
				tokenLowBalanceHighMcap,
				tokenHighBalanceLowMcap
			].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([
				tokenHighBalanceLowMcap.id,
				tokenLowBalanceHighMcap.id,
				tokenZeroBalanceHighMcap.id,
				tokenNoBalanceHighMcap.id
			]);
		});

		it('should prioritise performance (24h %) when primarySortStrategy is performance, after deprecation', () => {
			const tokenPerfHigh: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-PERF-HIGH'),
				symbol: 'HIGH',
				name: 'High Perf',
				network: ICP_NETWORK
			};

			const tokenPerfLow: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-PERF-LOW'),
				symbol: 'LOW',
				name: 'Low Perf',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenPerfHigh.id]: { data: 999n, certified },
				[tokenPerfLow.id]: { data: 999n, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenPerfHigh.id]: { usd: 1, usd_market_cap: 0, usd_24h_change: 3 },
				[tokenPerfLow.id]: { usd: 1, usd_market_cap: 0, usd_24h_change: -3 }
			};

			const tokens = [tokenPerfLow, tokenPerfHigh].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: [],
				primarySortStrategy: 'performance'
			});

			expect(result.map((t) => t.id)).toEqual([tokenPerfHigh.id, tokenPerfLow.id]);
		});

		it('should sort tokens with performance data before tokens without when primarySortStrategy is performance, and fall back correctly for missing performance', () => {
			const tokenWithPerf: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-PERF-PRESENT'),
				symbol: 'PERF',
				name: 'Has perf',
				network: ICP_NETWORK
			};

			const tokenNoPerfHighUsd: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-PERF-MISSING-HIGH'),
				symbol: 'NOPERF-HIGH',
				name: 'No perf (high USD)',
				network: ICP_NETWORK
			};

			const tokenNoPerfLowUsd: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-PERF-MISSING-LOW'),
				symbol: 'NOPERF-LOW',
				name: 'No perf (low USD)',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenWithPerf.id]: { data: 1n, certified },
				[tokenNoPerfHighUsd.id]: { data: 100n, certified },
				[tokenNoPerfLowUsd.id]: { data: 10n, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenWithPerf.id]: { usd: 1, usd_market_cap: 0, usd_24h_change: 1 },
				[tokenNoPerfHighUsd.id]: { usd: 1, usd_market_cap: 0 },
				[tokenNoPerfLowUsd.id]: { usd: 1, usd_market_cap: 0 }
			};

			const tokens = [tokenNoPerfLowUsd, tokenWithPerf, tokenNoPerfHighUsd].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: [],
				primarySortStrategy: 'performance'
			});

			expect(result.map((t) => t.id)).toEqual([
				tokenWithPerf.id,
				tokenNoPerfHighUsd.id,
				tokenNoPerfLowUsd.id
			]);
		});

		it('should prioritise symbol ordering when primarySortStrategy is symbol, after deprecation', () => {
			const tokenAAA: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-SORT-AAA'),
				symbol: 'AAA',
				name: 'AAA Token',
				network: ICP_NETWORK
			};

			const tokenZZZ: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-SORT-ZZZ'),
				symbol: 'ZZZ',
				name: 'ZZZ Token',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenAAA.id]: { data: 1n, certified },
				[tokenZZZ.id]: { data: 999n, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenAAA.id]: { usd: 1, usd_market_cap: 0 },
				[tokenZZZ.id]: { usd: 1, usd_market_cap: 0 }
			};

			const tokens = [tokenZZZ, tokenAAA].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: [],
				primarySortStrategy: 'symbol'
			});

			expect(result.map((t) => t.id)).toEqual([tokenAAA.id, tokenZZZ.id]);
		});

		it('should sort pinned networks before unpinned networks when other criteria are equal', () => {
			const tokenOnPinnedNet: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-PNET-A'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};
			const tokenOnUnpinnedNet: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-UNPNET-B'),
				symbol: 'SAME',
				name: 'SameName',
				network: { ...ICP_NETWORK, id: ETHEREUM_NETWORK_ID, name: ICP_NETWORK.name }
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenOnPinnedNet.id]: { data: ZERO, certified },
				[tokenOnUnpinnedNet.id]: { data: ZERO, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenOnPinnedNet.id]: { usd: 0, usd_market_cap: 0 },
				[tokenOnUnpinnedNet.id]: { usd: 0, usd_market_cap: 0 }
			};

			const tokens = [tokenOnUnpinnedNet, tokenOnPinnedNet].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: [{ id: ICP_NETWORK_ID }]
			});

			expect(result.map((t) => t.id)).toEqual([tokenOnPinnedNet.id, tokenOnUnpinnedNet.id]);
		});

		it('should sort by pinned network order when both networks are pinned', () => {
			const tokenNetA: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-NETA'),
				symbol: 'SAME',
				name: 'SameName',
				network: { ...ICP_NETWORK, id: BTC_MAINNET_NETWORK_ID, name: ICP_NETWORK.name }
			};
			const tokenNetB: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-NETB'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenNetA.id]: { data: ZERO, certified },
				[tokenNetB.id]: { data: ZERO, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenNetA.id]: { usd: 0, usd_market_cap: 0 },
				[tokenNetB.id]: { usd: 0, usd_market_cap: 0 }
			};

			const tokens = [tokenNetA, tokenNetB].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: [{ id: ICP_NETWORK_ID }, { id: BTC_MAINNET_NETWORK_ID }]
			});

			expect(result.map((t) => t.id)).toEqual([tokenNetB.id, tokenNetA.id]);
		});

		it('should sort by name when symbols are the same', () => {
			const tokenNameA: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-NAME-A'),
				symbol: 'SAME',
				name: 'Alpha',
				network: ICP_NETWORK
			};
			const tokenNameZ: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-NAME-Z'),
				symbol: 'SAME',
				name: 'Zulu',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenNameA.id]: { data: ZERO, certified },
				[tokenNameZ.id]: { data: ZERO, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenNameA.id]: { usd: 0, usd_market_cap: 0 },
				[tokenNameZ.id]: { usd: 0, usd_market_cap: 0 }
			};

			const tokens = [tokenNameZ, tokenNameA].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenNameA.id, tokenNameZ.id]);
		});

		it('should handle group items in sortTokens', () => {
			const tokenA: TokenUi = {
				...mockValidToken,
				id: parseTokenId('TokenId-GRP-A'),
				symbol: 'AAA',
				name: 'Alpha',
				network: ICP_NETWORK,
				balance: ZERO,
				usdBalance: 0
			};
			const tokenB: TokenUi = {
				...mockValidToken,
				id: parseTokenId('TokenId-GRP-B'),
				symbol: 'BBB',
				name: 'Beta',
				network: ICP_NETWORK,
				balance: ZERO,
				usdBalance: 0
			};

			const groupId = parseTokenGroupId('GroupId-GRP');
			const groupItem: TokenUiOrGroupUi = {
				group: {
					id: groupId,
					decimals: 8,
					groupData: { id: groupId, symbol: 'GRP', name: 'Group' },
					tokens: [tokenA, tokenB],
					balance: ZERO,
					usdBalance: 0
				}
			};

			const singleItem: TokenUiOrGroupUi = {
				token: {
					...mockValidToken,
					id: parseTokenId('TokenId-SINGLE'),
					symbol: 'ZZZ',
					name: 'Zulu',
					network: ICP_NETWORK,
					balance: ZERO,
					usdBalance: 0
				}
			};

			const result = sortTokens({
				$tokens: [singleItem, groupItem],
				$tokensToPin: [{ id: tokenA.id }],
				$networksToPin: []
			});

			expect(result).toStrictEqual([groupItem, singleItem]);
		});

		it('should handle group items where no group token is pinned', () => {
			const tokenA: TokenUi = {
				...mockValidToken,
				id: parseTokenId('TokenId-GRP-X'),
				symbol: 'AAA',
				name: 'Alpha',
				network: ICP_NETWORK,
				balance: ZERO,
				usdBalance: 0
			};

			const groupId = parseTokenGroupId('GroupId-GRP2');
			const groupItem: TokenUiOrGroupUi = {
				group: {
					id: groupId,
					decimals: 8,
					groupData: { id: groupId, symbol: 'GRP', name: 'Group' },
					tokens: [tokenA],
					balance: ZERO,
					usdBalance: 0
				}
			};

			const singleItem: TokenUiOrGroupUi = {
				token: {
					...mockValidToken,
					id: parseTokenId('TokenId-SINGLE2'),
					symbol: 'ZZZ',
					name: 'Zulu',
					network: ICP_NETWORK,
					balance: ZERO,
					usdBalance: 0
				}
			};

			const result = sortTokens({
				$tokens: [singleItem, groupItem],
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result).toStrictEqual([groupItem, singleItem]);
		});

		it('should fall back to market cap when all other criteria are equal', () => {
			const tokenLowMcap: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-MCAP-LOW'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};
			const tokenHighMcap: Token = {
				...mockValidToken,
				id: parseTokenId('TokenId-MCAP-HIGH'),
				symbol: 'SAME',
				name: 'SameName',
				network: ICP_NETWORK
			};

			const $balances: CertifiedStoreData<BalancesData> = {
				[tokenLowMcap.id]: { data: ZERO, certified },
				[tokenHighMcap.id]: { data: ZERO, certified }
			};

			const $exchanges: ExchangesData = {
				[tokenLowMcap.id]: { usd: 0, usd_market_cap: 1 },
				[tokenHighMcap.id]: { usd: 0, usd_market_cap: 999 }
			};

			const tokens = [tokenLowMcap, tokenHighMcap].map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances: {},
					$exchanges
				})
			);

			const result = sortTokens({
				$tokens: tokens,
				$tokensToPin: [],
				$networksToPin: []
			});

			expect(result.map((t) => t.id)).toEqual([tokenHighMcap.id, tokenLowMcap.id]);
		});
	});

	describe('sumTokensUiUsdBalance', () => {
		it('should correctly calculate USD total balance when tokens have usdBalance', () => {
			const tokens: TokenUi[] = [
				{ ...ICP_TOKEN, usdBalance: 50 },
				{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
				{ ...ETHEREUM_TOKEN, usdBalance: 100 }
			];

			const result = sumTokensUiUsdBalance(tokens);

			expect(result).toEqual(200);
		});

		it('should correctly calculate USD total balance when some tokens do not have usdBalance', () => {
			const tokens: TokenUi[] = [
				{ ...ICP_TOKEN, usdBalance: 50 },
				{ ...BTC_MAINNET_TOKEN, usdBalance: 0 },
				{ ...ETHEREUM_TOKEN }
			];

			const result = sumTokensUiUsdBalance(tokens);

			expect(result).toEqual(50);
		});

		it('should correctly calculate USD total balance when tokens list is empty', () => {
			const result = sumTokensUiUsdBalance([]);

			expect(result).toEqual(0);
		});
	});

	describe('sumTokensUiUsdStakeBalance', () => {
		it('should correctly calculate USD total staking balance', () => {
			const tokens: TokenUi[] = [
				{ ...ICP_TOKEN, stakeUsdBalance: 50 },
				{ ...BTC_MAINNET_TOKEN, stakeUsdBalance: 50 },
				{ ...ETHEREUM_TOKEN, stakeUsdBalance: 100 }
			];

			const result = sumTokensUiUsdStakeBalance(tokens);

			expect(result).toEqual(200);
		});

		it('should correctly calculate USD total staking balance when some tokens do not have it', () => {
			const tokens: TokenUi[] = [
				{ ...ICP_TOKEN, stakeUsdBalance: 50 },
				{ ...BTC_MAINNET_TOKEN, stakeUsdBalance: 0 },
				{ ...ETHEREUM_TOKEN }
			];

			const result = sumTokensUiUsdStakeBalance(tokens);

			expect(result).toEqual(50);
		});

		it('should include claimable stake balance in the total', () => {
			const tokens: TokenUi[] = [
				{ ...ICP_TOKEN, stakeUsdBalance: 50, claimableStakeBalanceUsd: 10 },
				{ ...BTC_MAINNET_TOKEN, stakeUsdBalance: 50 },
				{ ...ETHEREUM_TOKEN, stakeUsdBalance: 100, claimableStakeBalanceUsd: 20 }
			];

			const result = sumTokensUiUsdStakeBalance(tokens);

			expect(result).toEqual(230);
		});

		it('should correctly calculate USD total staking balance when tokens list is empty', () => {
			const result = sumTokensUiUsdStakeBalance([]);

			expect(result).toEqual(0);
		});
	});

	describe('filterEnabledTokens', () => {
		it('should correctly return filtered tokens when all tokens have "enabled" property', () => {
			const ENABLED_ICP_TOKEN = { ...ICP_TOKEN, enabled: true };
			const ENABLED_ETHEREUM_TOKEN = { ...ENABLED_ICP_TOKEN, enabled: true };

			const tokens: (Token & { enabled?: boolean })[] = [
				ENABLED_ICP_TOKEN,
				ENABLED_ETHEREUM_TOKEN,
				{ ...BTC_MAINNET_TOKEN, enabled: false }
			];

			const result = filterEnabledTokens([tokens]);

			expect(result).toEqual([ENABLED_ICP_TOKEN, ENABLED_ETHEREUM_TOKEN]);
		});

		it('should correctly return filtered tokens when not all tokens have "enabled" property', () => {
			const ENABLED_BY_DEFAULT_ICP_TOKEN = ICP_TOKEN;
			const ENABLED_BY_DEFAULT_ETHEREUM_TOKEN = ETHEREUM_TOKEN;

			const tokens: (Token & { enabled?: boolean })[] = [
				ENABLED_BY_DEFAULT_ICP_TOKEN,
				ENABLED_BY_DEFAULT_ETHEREUM_TOKEN,
				{ ...BTC_MAINNET_TOKEN, enabled: false }
			];

			const result = filterEnabledTokens([tokens]);

			expect(result).toEqual([ENABLED_BY_DEFAULT_ICP_TOKEN, ENABLED_BY_DEFAULT_ETHEREUM_TOKEN]);
		});
	});

	describe('sumMainnetTokensUsdBalancesPerNetwork', () => {
		const mockTokens = [
			{ ...ICP_TOKEN, usdBalance: Number(bn2Bi) },
			{ ...BTC_MAINNET_TOKEN, usdBalance: Number(bn1Bi) },
			{ ...ETHEREUM_TOKEN, usdBalance: Number(bn3Bi) }
		];

		const mockTestnetToken = { ...BTC_TESTNET_TOKEN, usdBalance: Number(bn3Bi) };

		const mockAllTokens = [...mockTokens, mockTestnetToken];

		it('should return a dictionary with correct balances for the list of mainnet and testnet tokens', () => {
			const result = sumMainnetTokensUsdBalancesPerNetwork({ tokens: mockAllTokens });

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(bn1Bi),
				[ETHEREUM_NETWORK_ID]: Number(bn3Bi),
				[ICP_NETWORK_ID]: Number(bn2Bi)
			});
		});

		it('should return a dictionary with correct balances if all token balances are 0', () => {
			const tokens = mockAllTokens.map((t) => ({
				...t,
				usdBalance: Number(ZERO)
			}));

			const result = sumMainnetTokensUsdBalancesPerNetwork({ tokens });

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(ZERO),
				[ETHEREUM_NETWORK_ID]: Number(ZERO),
				[ICP_NETWORK_ID]: Number(ZERO)
			});
		});

		it('should return an empty dictionary if no mainnet tokens are in the list', () => {
			const result = sumMainnetTokensUsdBalancesPerNetwork({ tokens: [mockTestnetToken] });

			expect(result).toEqual({});
		});

		it('should return an empty dictionary if no tokens are provided', () => {
			const result = sumMainnetTokensUsdBalancesPerNetwork({ tokens: [] });

			expect(result).toEqual({});
		});
	});

	describe('sumMainnetTokensUsdStakeBalancesPerNetwork', () => {
		const mockTokens = [
			{ ...ICP_TOKEN, stakeUsdBalance: Number(bn2Bi), claimableStakeBalanceUsd: Number(bn1Bi) },
			{
				...BTC_MAINNET_TOKEN,
				stakeUsdBalance: Number(bn1Bi),
				claimableStakeBalanceUsd: Number(bn3Bi)
			},
			{ ...ETHEREUM_TOKEN, stakeUsdBalance: Number(bn3Bi), claimableStakeBalanceUsd: Number(bn2Bi) }
		];

		const mockTestnetToken = {
			...BTC_TESTNET_TOKEN,
			stakeUsdBalance: Number(bn3Bi),
			claimableStakeBalanceUsd: Number(bn2Bi)
		};

		const mockAllTokens = [...mockTokens, mockTestnetToken];

		it('should return a dictionary with correct balances for the list of mainnet and testnet tokens', () => {
			const result = sumMainnetTokensUsdStakeBalancesPerNetwork({ tokens: mockAllTokens });

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(bn1Bi + bn3Bi),
				[ETHEREUM_NETWORK_ID]: Number(bn3Bi + bn2Bi),
				[ICP_NETWORK_ID]: Number(bn2Bi + bn1Bi)
			});
		});

		it('should handle missing stake balances', () => {
			const result = sumMainnetTokensUsdStakeBalancesPerNetwork({
				tokens: [...mockAllTokens, { ...BONK_TOKEN, claimableStakeBalanceUsd: 123 }]
			});

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(bn1Bi + bn3Bi),
				[ETHEREUM_NETWORK_ID]: Number(bn3Bi + bn2Bi),
				[ICP_NETWORK_ID]: Number(bn2Bi + bn1Bi),
				[SOLANA_MAINNET_NETWORK_ID]: 123
			});
		});

		it('should handle missing claimable balances', () => {
			const result = sumMainnetTokensUsdStakeBalancesPerNetwork({
				tokens: [...mockAllTokens, { ...BONK_TOKEN, stakeUsdBalance: 456 }]
			});

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(bn1Bi + bn3Bi),
				[ETHEREUM_NETWORK_ID]: Number(bn3Bi + bn2Bi),
				[ICP_NETWORK_ID]: Number(bn2Bi + bn1Bi),
				[SOLANA_MAINNET_NETWORK_ID]: 456
			});
		});

		it('should return a dictionary with correct balances if all token balances are 0', () => {
			const tokens = mockAllTokens.map((t) => ({
				...t,
				stakeUsdBalance: Number(ZERO),
				claimableStakeBalanceUsd: Number(ZERO)
			}));

			const result = sumMainnetTokensUsdStakeBalancesPerNetwork({
				tokens
			});

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(ZERO),
				[ETHEREUM_NETWORK_ID]: Number(ZERO),
				[ICP_NETWORK_ID]: Number(ZERO)
			});
		});

		it('should return an empty dictionary if no mainnet tokens are in the list', () => {
			const result = sumMainnetTokensUsdStakeBalancesPerNetwork({ tokens: [mockTestnetToken] });

			expect(result).toEqual({});
		});

		it('should return an empty dictionary if no tokens are provided', () => {
			const result = sumMainnetTokensUsdStakeBalancesPerNetwork({ tokens: [] });

			expect(result).toEqual({});
		});
	});

	describe('pinEnabledTokensAtTop', () => {
		it('should pin enabled tokens at the top while preserving the order', () => {
			const tokens: TokenToggleable<Token>[] = [
				{ ...ICP_TOKEN, enabled: false },
				{ ...BTC_MAINNET_TOKEN, enabled: true },
				{ ...ETHEREUM_TOKEN, enabled: true }
			];

			const result = pinEnabledTokensAtTop(tokens);

			expect(result).toEqual([
				{ ...BTC_MAINNET_TOKEN, enabled: true },
				{ ...ETHEREUM_TOKEN, enabled: true },
				{ ...ICP_TOKEN, enabled: false }
			]);
		});

		it('should return the same array when all tokens are enabled', () => {
			const tokens: TokenToggleable<Token>[] = mockTokens.map((t) => ({ ...t, enabled: true }));

			const result = pinEnabledTokensAtTop(tokens);

			expect(result).toEqual(tokens);
		});

		it('should return the same array when all tokens are disabled', () => {
			const tokens: TokenToggleable<Token>[] = mockTokens.map((t) => ({ ...t, enabled: false }));

			const result = pinEnabledTokensAtTop(tokens);

			expect(result).toEqual(tokens);
		});
	});

	describe('filterTokens', () => {
		const tokens = [
			...mockTokens,
			mockValidIcrcToken,
			mockValidIcCkToken,
			mockValidExtV2Token,
			mockValidDip721Token,
			mockValidIcPunksToken,
			mockValidErc20Token,
			mockValidErc721Token,
			mockValidErc1155Token,
			mockValidSplToken
		];

		it('should filter tokens by symbol correctly when filter is provided', () => {
			expect(filterTokens({ tokens, filter: 'ICP' })).toStrictEqual([ICP_TOKEN]);
			expect(filterTokens({ tokens, filter: 'BTC' })).toStrictEqual([BTC_MAINNET_TOKEN]);
			expect(filterTokens({ tokens, filter: 'PEPE' })).toStrictEqual([]);
		});

		it('should filter tokens by name correctly when filter is provided', () => {
			expect(filterTokens({ tokens, filter: 'Bit' })).toStrictEqual([BTC_MAINNET_TOKEN]);
			expect(filterTokens({ tokens, filter: 'Eth' })).toStrictEqual([ETHEREUM_TOKEN]);
		});

		it('should filter tokens by twin token symbol correctly when filter is provided', () => {
			expect(
				filterTokens({ tokens: [...mockTokens, mockValidIcCkToken], filter: 'STK' })
			).toStrictEqual([mockValidIcCkToken]);
		});

		it('should filter ICRC custom tokens by alternativeName', () => {
			const icrcCustomToken = {
				...mockValidIcrcToken,
				enabled: true,
				alternativeName: 'MyAltName'
			};

			const result = filterTokens({ tokens: [icrcCustomToken], filter: 'MyAlt' });

			expect(result).toStrictEqual([icrcCustomToken]);
		});

		it('should match via twin token when main token does not match filter', () => {
			const ckToken: IcCkToken = {
				...mockValidIcCkToken,
				id: parseTokenId('ckUniqueId'),
				symbol: 'ckXYZ',
				name: 'ckXYZ Token',
				twinToken: {
					...mockValidToken,
					id: parseTokenId('twinXYZ'),
					symbol: 'XYZ',
					name: 'XYZ Native',
					standard: { code: 'erc20' }
				}
			};

			const result = filterTokens({ tokens: [ckToken], filter: 'XYZ Native' });

			expect(result).toStrictEqual([ckToken]);
		});

		it('should filter tokens correctly when filter is not provided', () => {
			expect(filterTokens({ tokens, filter: '' })).toStrictEqual(tokens);
		});

		it.each([mockValidErc20Token, mockValidErc721Token, mockValidErc1155Token])(
			'should filter by address for ERC tokens with standard $standard',
			(token) => {
				expect(filterTokens({ tokens, filter: token.address })).toStrictEqual([token]);

				expect(filterTokens({ tokens, filter: token.address.toLowerCase() })).toStrictEqual([
					token
				]);

				expect(filterTokens({ tokens, filter: token.address.toUpperCase() })).toStrictEqual([
					token
				]);

				expect(filterTokens({ tokens, filter: token.address.slice(0, 5) })).toStrictEqual([token]);
			}
		);

		it('should filter by address for SPL tokens', () => {
			expect(filterTokens({ tokens, filter: mockValidSplToken.address })).toStrictEqual([
				mockValidSplToken
			]);

			expect(
				filterTokens({ tokens, filter: mockValidSplToken.address.toLowerCase() })
			).toStrictEqual([]);

			expect(
				filterTokens({ tokens, filter: mockValidSplToken.address.toUpperCase() })
			).toStrictEqual([]);

			expect(filterTokens({ tokens, filter: mockValidSplToken.address.slice(0, 5) })).toStrictEqual(
				[mockValidSplToken]
			);
		});

		it('should filter by canister IDs for IC tokens', () => {
			expect(filterTokens({ tokens, filter: mockValidIcrcToken.ledgerCanisterId })).toStrictEqual([
				mockValidIcrcToken,
				mockValidIcCkToken
			]);

			expect(
				filterTokens({ tokens, filter: mockValidIcrcToken.ledgerCanisterId.toLowerCase() })
			).toStrictEqual([mockValidIcrcToken, mockValidIcCkToken]);

			expect(
				filterTokens({ tokens, filter: mockValidIcrcToken.ledgerCanisterId.toUpperCase() })
			).toStrictEqual([mockValidIcrcToken, mockValidIcCkToken]);

			expect(
				filterTokens({ tokens, filter: mockValidIcrcToken.ledgerCanisterId.slice(0, 5) })
			).toStrictEqual([mockValidIcrcToken, mockValidIcCkToken]);

			const mockToken = { ...mockValidIcrcToken, indexCanisterId: mockIndexCanisterId };

			expect(
				filterTokens({ tokens: [...tokens, mockToken], filter: mockToken.indexCanisterId })
			).toStrictEqual([mockToken]);

			expect(
				filterTokens({
					tokens: [...tokens, mockToken],
					filter: mockToken.indexCanisterId.toLowerCase()
				})
			).toStrictEqual([mockToken]);

			expect(
				filterTokens({
					tokens: [...tokens, mockToken],
					filter: mockToken.indexCanisterId.toUpperCase()
				})
			).toStrictEqual([mockToken]);

			expect(
				filterTokens({
					tokens: [...tokens, mockToken],
					filter: mockToken.indexCanisterId.slice(0, 5)
				})
			).toStrictEqual([mockToken]);
		});

		it('should filter by canister IDs for EXT tokens', () => {
			expect(filterTokens({ tokens, filter: mockValidExtV2Token.canisterId })).toStrictEqual([
				mockValidExtV2Token
			]);

			expect(
				filterTokens({ tokens, filter: mockValidExtV2Token.canisterId.toLowerCase() })
			).toStrictEqual([mockValidExtV2Token]);

			expect(
				filterTokens({ tokens, filter: mockValidExtV2Token.canisterId.toUpperCase() })
			).toStrictEqual([mockValidExtV2Token]);

			expect(
				filterTokens({ tokens, filter: mockValidExtV2Token.canisterId.slice(0, 5) })
			).toStrictEqual([mockValidExtV2Token]);
		});

		it('should filter by canister IDs for DIP721 tokens', () => {
			expect(filterTokens({ tokens, filter: mockValidDip721Token.canisterId })).toStrictEqual([
				mockValidDip721Token
			]);

			expect(
				filterTokens({ tokens, filter: mockValidDip721Token.canisterId.toLowerCase() })
			).toStrictEqual([mockValidDip721Token]);

			expect(
				filterTokens({ tokens, filter: mockValidDip721Token.canisterId.toUpperCase() })
			).toStrictEqual([mockValidDip721Token]);

			expect(
				filterTokens({ tokens, filter: mockValidDip721Token.canisterId.slice(0, 5) })
			).toStrictEqual([mockValidDip721Token]);
		});

		it('should filter by canister IDs for ICPunks tokens', () => {
			expect(filterTokens({ tokens, filter: mockValidIcPunksToken.canisterId })).toStrictEqual([
				mockValidIcPunksToken
			]);

			expect(
				filterTokens({ tokens, filter: mockValidIcPunksToken.canisterId.toLowerCase() })
			).toStrictEqual([mockValidIcPunksToken]);

			expect(
				filterTokens({ tokens, filter: mockValidIcPunksToken.canisterId.toUpperCase() })
			).toStrictEqual([mockValidIcPunksToken]);

			expect(
				filterTokens({ tokens, filter: mockValidIcPunksToken.canisterId.slice(0, 5) })
			).toStrictEqual([mockValidIcPunksToken]);
		});

		it('should not filter by network', () => {
			expect(
				filterTokens({ tokens: [...mockTokens, PEPE_TOKEN], filter: 'ethereum' })
			).toStrictEqual([ETHEREUM_TOKEN]);
		});
	});

	describe('findToken', () => {
		it('should return the correct token by symbol', () => {
			const result = findToken({ tokens: mockTokens, symbol: BTC_MAINNET_SYMBOL });

			expect(result).toEqual(BTC_MAINNET_TOKEN);
		});

		it('should return undefined if token is not found', () => {
			const result = findToken({ tokens: mockTokens, symbol: 'UNKNOWN_TOKEN' });

			expect(result).toBeUndefined();
		});
	});

	describe('defineEnabledTokens', () => {
		const mainnetTokens: Token[] = [SOLANA_TOKEN];
		const testnetTokens: Token[] = [SOLANA_DEVNET_TOKEN];
		const localTokens: Token[] = [SOLANA_LOCAL_TOKEN];

		const mainnetNetworks: Network[] = mainnetTokens.map(({ network }) => network);
		const testnetNetworks: Network[] = testnetTokens.map(({ network }) => network);
		const localNetworks: Network[] = localTokens.map(({ network }) => network);

		const networks: Network[] = [...mainnetNetworks, ...testnetNetworks, ...localNetworks];

		const mapUserNetworks = ({
			enabledNetworks = networks,
			disabledNetworks = []
		}: {
			enabledNetworks?: Network[];
			disabledNetworks?: Network[];
		}): UserNetworks => ({
			...enabledNetworks.reduce<UserNetworks>(
				(acc, { id, env }) => ({ ...acc, [id]: { enabled: true, isTestnet: env === 'testnet' } }),
				{}
			),
			...disabledNetworks.reduce<UserNetworks>(
				(acc, { id, env }) => ({ ...acc, [id]: { enabled: false, isTestnet: env === 'testnet' } }),
				{}
			)
		});

		const userNetworks: UserNetworks = mapUserNetworks({});

		const mockBaseParams = {
			$testnetsEnabled: false,
			$userNetworks: userNetworks,
			mainnetFlag: true,
			mainnetTokens,
			testnetTokens,
			localTokens
		};

		beforeEach(() => {
			vi.spyOn(appConstants, 'LOCAL', 'get').mockReturnValue(false);
		});

		describe('when testnets are disabled', () => {
			const mockParams = { ...mockBaseParams, $testnetsEnabled: false };

			it('should return only mainnet tokens by default', () => {
				expect(defineEnabledTokens(mockParams)).toEqual(mainnetTokens);
			});

			it('should return an empty array when mainnet is disabled', () => {
				expect(defineEnabledTokens({ ...mockParams, mainnetFlag: false })).toEqual([]);
			});

			it('should return an empty array when all networks are disabled by the user', () => {
				expect(defineEnabledTokens({ ...mockParams, $userNetworks: {} })).toEqual([]);
			});

			it('should return an empty array when mainnet networks are disabled by the user', () => {
				expect(
					defineEnabledTokens({
						...mockParams,
						$userNetworks: mapUserNetworks({ disabledNetworks: mainnetNetworks })
					})
				).toEqual([]);
			});

			it('should return an empty array when no mainnet token is provided', () => {
				expect(defineEnabledTokens({ ...mockParams, mainnetTokens: [] })).toEqual([]);
			});

			it('should ignore the local tokens when they are enabled', () => {
				vi.spyOn(appConstants, 'LOCAL', 'get').mockReturnValueOnce(false);

				expect(defineEnabledTokens(mockParams)).toEqual(mainnetTokens);
			});
		});

		describe('when testnets are enabled', () => {
			const mockParams = { ...mockBaseParams, $testnetsEnabled: true };

			it('should return mainnet and testnet tokens', () => {
				expect(defineEnabledTokens(mockParams)).toEqual([...mainnetTokens, ...testnetTokens]);
			});

			it('should return only testnet tokens when mainnet disabled', () => {
				expect(defineEnabledTokens({ ...mockParams, mainnetFlag: false })).toEqual(testnetTokens);
			});

			it('should return an empty array when all networks are disabled by the user', () => {
				expect(defineEnabledTokens({ ...mockParams, $userNetworks: {} })).toEqual([]);
			});

			it('should return only mainnet tokens when testnet disabled by the user', () => {
				expect(
					defineEnabledTokens({
						...mockParams,
						$userNetworks: mapUserNetworks({ disabledNetworks: testnetNetworks })
					})
				).toEqual(mainnetTokens);
			});

			it('should return only testnet tokens when mainnet disabled by the user', () => {
				expect(
					defineEnabledTokens({
						...mockParams,
						$userNetworks: mapUserNetworks({ disabledNetworks: mainnetNetworks })
					})
				).toEqual(testnetTokens);
			});

			it('should return only mainnet tokens when no testnet token is provided', () => {
				const { testnetTokens: _, ...params } = mockParams;

				expect(defineEnabledTokens(params)).toEqual(mainnetTokens);
			});

			describe('when local networks are enabled', () => {
				beforeEach(() => {
					vi.spyOn(appConstants, 'LOCAL', 'get').mockReturnValueOnce(true);
				});

				it('should return all tokens', () => {
					expect(defineEnabledTokens(mockParams)).toEqual([
						...mainnetTokens,
						...testnetTokens,
						...localTokens
					]);
				});

				it('should return only testnet and local tokens when mainnet disabled', () => {
					expect(defineEnabledTokens({ ...mockParams, mainnetFlag: false })).toEqual([
						...testnetTokens,
						...localTokens
					]);
				});

				it('should return empty array when all networks are disabled by the user', () => {
					expect(defineEnabledTokens({ ...mockParams, $userNetworks: {} })).toEqual([]);
				});

				it('should return only mainnet and testnet tokens when local disabled by the user', () => {
					expect(
						defineEnabledTokens({
							...mockParams,
							$userNetworks: mapUserNetworks({ disabledNetworks: localNetworks })
						})
					).toEqual([...mainnetTokens, ...testnetTokens]);
				});

				it('should return only testnet and local tokens when mainnet disabled by the user', () => {
					expect(
						defineEnabledTokens({
							...mockParams,
							$userNetworks: mapUserNetworks({ disabledNetworks: mainnetNetworks })
						})
					).toEqual([...testnetTokens, ...localTokens]);
				});

				it('should return only mainnet and local tokens when testnet disabled by the user', () => {
					expect(
						defineEnabledTokens({
							...mockParams,
							$userNetworks: mapUserNetworks({ disabledNetworks: testnetNetworks })
						})
					).toEqual([...mainnetTokens, ...localTokens]);
				});

				it('should return only mainnet and testnet tokens when no local token is provided', () => {
					const { localTokens: _, ...params } = mockParams;

					expect(defineEnabledTokens(params)).toEqual([...mainnetTokens, ...testnetTokens]);
				});
			});
		});
	});

	describe('saveAllCustomTokens', () => {
		beforeEach(() => {
			vi.mock('$lib/services/manage-tokens.services', () => ({
				saveCustomTokensWithKey: vi.fn().mockResolvedValue(undefined)
			}));

			vi.mock('$eth/services/manage-tokens.services', () => ({
				saveErc20UserTokens: vi.fn().mockResolvedValue(undefined)
			}));

			vi.clearAllMocks();
		});

		it('should show info toast and return if no tokens to save', async () => {
			await saveAllCustomTokens({
				tokens: [],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(toastsShow).toHaveBeenCalledWith({
				text: i18nMock.tokens.manage.info.no_changes,
				level: 'info',
				duration: 5000
			});

			expect(saveCustomTokensWithKey).not.toHaveBeenCalled();
		});

		it('should call saveCustomTokensWithKey when ICRC tokens are present', async () => {
			const token = { ...mockValidIcrcToken, enabled: true };

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'Icrc' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when EXT tokens are present', async () => {
			const token = { ...mockValidExtV2Token, enabled: true };

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'ExtV2' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when DIP721 tokens are present', async () => {
			const token = { ...mockValidDip721Token, enabled: true };

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'Dip721' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when ICPunks tokens are present', async () => {
			const token = { ...mockValidIcPunksToken, enabled: true };

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'IcPunks' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when ERC20 tokens are present', async () => {
			const token = { ...mockValidErc20Token, enabled: true } as unknown as TokenUi;

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([expect.objectContaining(token)]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when ERC4626 tokens are present', async () => {
			const token = { ...mockValidErc4626Token, enabled: true } as unknown as TokenUi;

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'Erc4626' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when ERC721 tokens are present', async () => {
			const token = { ...mockValidErc721Token, enabled: true } as unknown as TokenUi;

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'Erc721' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when ERC1155 tokens are present', async () => {
			const token = { ...mockValidErc1155Token, enabled: true } as unknown as TokenUi;

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'Erc1155' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey when SPL tokens are present', async () => {
			const token = { ...BONK_TOKEN, enabled: true } as unknown as TokenUi;

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([expect.objectContaining(token)]),
					identity: mockIdentity
				})
			);
		});

		it('should call saveCustomTokensWithKey with SplDevnet key for devnet SPL tokens', async () => {
			const token = {
				...mockValidSplToken,
				network: SOLANA_DEVNET_NETWORK,
				enabled: true
			} as unknown as TokenUi;

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({
					tokens: expect.arrayContaining([
						expect.objectContaining({ ...token, networkKey: 'SplDevnet' })
					]),
					identity: mockIdentity
				})
			);
		});

		it('should pass progress, onSuccess and modalNext along when provided', async () => {
			const token = { ...mockValidIcrcToken, enabled: true };

			const progress = vi.fn();
			const onSuccess = vi.fn();
			const modalNext = vi.fn();

			await saveAllCustomTokens({
				tokens: [token],
				$authIdentity: mockIdentity,
				$i18n: i18nMock,
				progress,
				onSuccess,
				modalNext
			});

			expect(saveCustomTokensWithKey).toHaveBeenCalledWith(
				expect.objectContaining({ progress, onSuccess, modalNext })
			);
		});
	});

	describe('filterTokensByNft', () => {
		const nft1 = { ...mockValidErc721Token, name: 'Cool Nft' };
		const nft2 = { ...mockValidErc1155Token, name: 'Even cooler Nft' };
		const nft3 = { ...mockValidExtV2Token, name: 'Another cool Nft' };
		const tokens = [ETHEREUM_TOKEN, SOLANA_TOKEN, BONK_TOKEN, nft1, nft2, nft3];

		it('should return all tokens when no filter is provided', () => {
			const result = filterTokensByNft({ tokens });

			expect(result).toHaveLength(6);
			expect(result).toEqual(tokens);
		});

		it('should return all non Nfts when filterNfts is false', () => {
			const result = filterTokensByNft({ tokens, filterNfts: false });

			expect(result).toHaveLength(3);
			expect(result).toEqual([ETHEREUM_TOKEN, SOLANA_TOKEN, BONK_TOKEN]);
		});

		it('should return all Nfts when filterNfts is true', () => {
			const result = filterTokensByNft({ tokens, filterNfts: true });

			expect(result).toHaveLength(3);
			expect(result).toEqual([nft1, nft2, nft3]);
		});

		it('should return an empty list if tokens is empty', () => {
			const result = filterTokensByNft({ tokens: [], filterNfts: false });

			expect(result).toHaveLength(0);
		});
	});

	describe('assertExistingTokens', () => {
		const mockErrorMsg = 'Token already exists';
		const mockTokens: Erc20Token[] = createMockErc20Tokens({ n: 5, networkEnv: 'mainnet' });
		const { id: _, ...mockToken } = mockTokens[mockTokens.length - 1];
		const mockParams = {
			existingTokens: mockTokens,
			token: mockToken,
			errorMsg: mockErrorMsg
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return true when existing tokens are empty', () => {
			const res = assertExistingTokens({
				...mockParams,
				existingTokens: [] as Erc20Token[]
			});

			expect(res).toStrictEqual({ valid: true });

			expect(toastsError).not.toHaveBeenCalled();
		});

		it('should return true when there is no match', () => {
			const res = assertExistingTokens({
				...mockParams,
				token: { ...mockToken, symbol: 'NEW' }
			});

			expect(res).toStrictEqual({ valid: true });

			expect(toastsError).not.toHaveBeenCalled();
		});

		it('should return false and toasts when symbol matches exactly', () => {
			const res = assertExistingTokens(mockParams);

			expect(res).toStrictEqual({ valid: false });

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({ msg: { text: mockErrorMsg } });
		});

		it('should be case-insensitive', () => {
			expect(
				assertExistingTokens({
					...mockParams,
					token: { ...mockToken, symbol: mockToken.symbol.toLowerCase() }
				})
			).toStrictEqual({ valid: false });

			expect(
				assertExistingTokens({
					...mockParams,
					token: { ...mockToken, symbol: mockToken.symbol.toUpperCase() }
				})
			).toStrictEqual({ valid: false });
		});

		it('should match the first item', () => {
			const res = assertExistingTokens({
				...mockParams,
				existingTokens: [
					...mockTokens,
					mockTokens[mockTokens.length - 1],
					mockTokens[mockTokens.length - 1]
				]
			});

			expect(res).toEqual({ valid: false });

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({ msg: { text: mockErrorMsg } });
		});
	});

	describe('getCodebaseTokenIconPath', () => {
		it('should return the correct icon path for ERC20 tokens', () => {
			const path = getCodebaseTokenIconPath({ token: mockValidErc20Token });

			expect(path).toBe(
				`/icons/${mockValidErc20Token.network.id.description?.toLowerCase()}/${mockValidErc20Token.address.toLowerCase()}.webp`
			);
		});

		it('should return the correct icon path for SPL tokens', () => {
			const path = getCodebaseTokenIconPath({ token: mockValidSplToken });

			expect(path).toBe(
				`/icons/${mockValidSplToken.network.id.description?.toLowerCase()}/${mockValidSplToken.address}.webp`
			);
		});

		it('should return undefined for unsupported token standards', () => {
			const tokens = [
				ICP_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN,
				BTC_MAINNET_TOKEN,
				mockValidErc721Token,
				mockValidErc1155Token,
				mockValidIcrcToken,
				mockValidExtV2Token
			];

			tokens.forEach((token) => {
				expect(getCodebaseTokenIconPath({ token })).toBeUndefined();
			});
		});

		it('should allow to choose the extension of the icon', () => {
			const pathPng = getCodebaseTokenIconPath({ token: mockValidErc20Token, extension: 'png' });

			expect(pathPng).toBe(
				`/icons/${mockValidErc20Token.network.id.description?.toLowerCase()}/${mockValidErc20Token.address}.png`
			);

			const pathJpg = getCodebaseTokenIconPath({ token: mockValidErc20Token, extension: 'svg' });

			expect(pathJpg).toBe(
				`/icons/${mockValidErc20Token.network.id.description?.toLowerCase()}/${mockValidErc20Token.address}.svg`
			);
		});

		it('should consider the network case-sensitiveness', () => {
			const path1 = getCodebaseTokenIconPath({
				token: { ...mockValidErc20Token, address: mockValidErc20Token.address.toLowerCase() }
			});

			expect(path1).toBe(
				`/icons/${mockValidErc20Token.network.id.description?.toLowerCase()}/${mockValidErc20Token.address.toLowerCase()}.webp`
			);

			const path2 = getCodebaseTokenIconPath({
				token: { ...mockValidErc20Token, address: mockValidErc20Token.address.toUpperCase() }
			});

			expect(path2).toBe(
				`/icons/${mockValidErc20Token.network.id.description?.toLowerCase()}/${mockValidErc20Token.address.toLowerCase()}.webp`
			);

			const path3 = getCodebaseTokenIconPath({
				token: { ...mockValidSplToken, address: mockValidSplToken.address.toLowerCase() }
			});

			expect(path3).toBe(
				`/icons/${mockValidSplToken.network.id.description?.toLowerCase()}/${mockValidSplToken.address.toLowerCase()}.webp`
			);

			const path4 = getCodebaseTokenIconPath({
				token: { ...mockValidSplToken, address: mockValidSplToken.address.toUpperCase() }
			});

			expect(path4).toBe(
				`/icons/${mockValidSplToken.network.id.description?.toLowerCase()}/${mockValidSplToken.address.toUpperCase()}.webp`
			);
		});
	});

	describe('findPutativeToken', () => {
		const allMockTokens = [
			mockValidErc20Token,
			mockValidErc721Token,
			mockValidErc1155Token,
			mockValidErc4626Token,
			mockValidSplToken,
			mockValidIcrcToken,
			mockValidIcCkToken,
			mockValidDip20Token,
			mockValidExtV2Token,
			mockValidDip721Token,
			mockValidIcPunksToken
		];

		it('should return undefined when identifier is undefined', () => {
			expect(findPutativeToken({ tokens: allMockTokens, identifier: undefined })).toBeUndefined();
		});

		it('should return undefined when tokens array is empty', () => {
			expect(
				findPutativeToken({ tokens: [], identifier: mockValidErc20Token.address })
			).toBeUndefined();
		});

		it('should return undefined when no token matches the identifier', () => {
			expect(
				findPutativeToken({ tokens: allMockTokens, identifier: 'non-existent' })
			).toBeUndefined();
		});

		it('should find an ERC20 token by its address', () => {
			expect(
				findPutativeToken({ tokens: allMockTokens, identifier: mockValidErc20Token.address })
			).toBe(mockValidErc20Token);
		});

		it('should find an ERC721 token by its address', () => {
			expect(
				findPutativeToken({ tokens: allMockTokens, identifier: mockValidErc721Token.address })
			).toBe(mockValidErc721Token);
		});

		it('should find an ERC1155 token by its address', () => {
			expect(
				findPutativeToken({ tokens: allMockTokens, identifier: mockValidErc1155Token.address })
			).toBe(mockValidErc1155Token);
		});

		it('should find an ERC4626 token by its address', () => {
			expect(
				findPutativeToken({ tokens: allMockTokens, identifier: mockValidErc4626Token.address })
			).toBe(mockValidErc4626Token);
		});

		it('should find an SPL token by its address', () => {
			expect(
				findPutativeToken({ tokens: allMockTokens, identifier: mockValidSplToken.address })
			).toBe(mockValidSplToken);
		});

		it('should find an ICRC token by its ledgerCanisterId', () => {
			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidIcrcToken.ledgerCanisterId
				})
			).toBe(mockValidIcrcToken);
		});

		it('should find an EXT token by its canisterId', () => {
			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidExtV2Token.canisterId
				})
			).toBe(mockValidExtV2Token);
		});

		it('should find a DIP721 token by its canisterId', () => {
			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidDip721Token.canisterId
				})
			).toBe(mockValidDip721Token);
		});

		it('should find an ICPunks token by its canisterId', () => {
			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidIcPunksToken.canisterId
				})
			).toBe(mockValidIcPunksToken);
		});

		it('should match ERC addresses case-insensitively', () => {
			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidErc20Token.address.toUpperCase()
				})
			).toBe(mockValidErc20Token);

			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidErc20Token.address.toLowerCase()
				})
			).toBe(mockValidErc20Token);
		});

		it('should match SPL addresses case-sensitively', () => {
			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidSplToken.address
				})
			).toBe(mockValidSplToken);

			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidSplToken.address.toLowerCase()
				})
			).toBeUndefined();

			expect(
				findPutativeToken({
					tokens: allMockTokens,
					identifier: mockValidSplToken.address.toUpperCase()
				})
			).toBeUndefined();
		});

		it('should return the first matching token when multiple tokens share the same identifier', () => {
			const duplicate = { ...mockValidIcrcToken, id: parseTokenId('DuplicateId') };

			const result = findPutativeToken({
				tokens: [mockValidIcrcToken, duplicate],
				identifier: mockValidIcrcToken.ledgerCanisterId
			});

			expect(result).toBe(mockValidIcrcToken);
		});

		it('should not match tokens that have no contract address', () => {
			expect(
				findPutativeToken({
					tokens: [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, SOLANA_TOKEN],
					identifier: 'BTC'
				})
			).toBeUndefined();
		});
	});

	describe('tokenListEqual', () => {
		it('should return true for two empty arrays', () => {
			expect(tokenListEqual([], [])).toBeTruthy();
		});

		it('should return true for arrays with the same ids in the same order', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [{ id: idA }, { id: idB }];
			const right = [{ id: idA }, { id: idB }];

			expect(tokenListEqual(left, right)).toBeTruthy();
		});

		it('should return true for arrays containing the same object references', () => {
			const first = { id: Symbol('a') };
			const second = { id: Symbol('b') };

			expect(tokenListEqual([first, second], [first, second])).toBeTruthy();
		});

		it('should return true for different objects that share the same ids in the same order', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [
				{ id: idA, label: 'left-a' },
				{ id: idB, label: 'left-b' }
			];
			const right = [
				{ id: idA, label: 'right-a' },
				{ id: idB, label: 'right-b' }
			];

			expect(tokenListEqual(left, right)).toBeTruthy();
		});

		it('should return false when array lengths differ', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			expect(tokenListEqual([{ id: idA }], [{ id: idA }, { id: idB }])).toBeFalsy();
			expect(tokenListEqual([{ id: idA }, { id: idB }], [{ id: idA }])).toBeFalsy();
		});

		it('should return false when ids differ', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');
			const idC = Symbol('c');

			const left = [{ id: idA }, { id: idB }];
			const right = [{ id: idA }, { id: idC }];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});

		it('should return false when ids differ at the first position', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');
			const idC = Symbol('c');

			const left = [{ id: idA }, { id: idB }];
			const right = [{ id: idC }, { id: idB }];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});

		it('should return false when ids differ at the last position', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');
			const idC = Symbol('c');

			const left = [{ id: idA }, { id: idB }];
			const right = [{ id: idA }, { id: idC }];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});

		it('should return false when the same ids appear in a different order', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [{ id: idA }, { id: idB }];
			const right = [{ id: idB }, { id: idA }];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});

		it('should return false when one array is empty and the other is not', () => {
			const idA = Symbol('a');

			expect(tokenListEqual([], [{ id: idA }])).toBeFalsy();
			expect(tokenListEqual([{ id: idA }], [])).toBeFalsy();
		});

		it('should compare only the id field and ignore other non-enabled properties', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, value: 1, nested: { side: 'left' } }];
			const right = [{ id: idA, value: 999, nested: { side: 'right' } }];

			expect(tokenListEqual(left, right)).toBeTruthy();
		});

		it('should return true for longer arrays with matching ids in the same order', () => {
			const ids = [Symbol('a'), Symbol('b'), Symbol('c'), Symbol('d'), Symbol('e')];

			const left = ids.map((id, index) => ({ id, index }));
			const right = ids.map((id, index) => ({ id, index: index + 100 }));

			expect(tokenListEqual(left, right)).toBeTruthy();
		});

		it('should return false for longer arrays when a single id differs', () => {
			const ids = [Symbol('a'), Symbol('b'), Symbol('c'), Symbol('d')];
			const differentId = Symbol('x');

			const left = ids.map((id) => ({ id }));
			const right = [{ id: ids[0] }, { id: ids[1] }, { id: differentId }, { id: ids[3] }];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});

		it('should return false when enabled property differs', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [
				{ id: idA, enabled: true },
				{ id: idB, enabled: false }
			];
			const right = [
				{ id: idA, enabled: true },
				{ id: idB, enabled: true }
			];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});

		it('should return true when enabled property is the same', () => {
			const idA = Symbol('a');
			const idB = Symbol('b');

			const left = [
				{ id: idA, enabled: true },
				{ id: idB, enabled: false }
			];
			const right = [
				{ id: idA, enabled: true },
				{ id: idB, enabled: false }
			];

			expect(tokenListEqual(left, right)).toBeTruthy();
		});

		it('should return false when one item has enabled and the other does not', () => {
			const idA = Symbol('a');

			const left = [{ id: idA, enabled: true }];
			const right = [{ id: idA }];

			expect(tokenListEqual(left, right)).toBeFalsy();
		});
	});
});
