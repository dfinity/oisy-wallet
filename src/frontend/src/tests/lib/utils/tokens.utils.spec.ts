import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import {
	BTC_MAINNET_SYMBOL,
	BTC_MAINNET_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as appContants from '$lib/constants/app.constants';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Network } from '$lib/types/network';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { UserNetworks } from '$lib/types/user-networks';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	defineEnabledTokens,
	filterEnabledTokens,
	filterTokens,
	findToken,
	pinEnabledTokensAtTop,
	pinTokensWithBalanceAtTop,
	sortTokens,
	sumMainnetTokensUsdBalancesPerNetwork,
	sumTokensUiUsdBalance
} from '$lib/utils/tokens.utils';
import { bn1Bi, bn2Bi, bn3Bi, certified, mockBalances } from '$tests/mocks/balances.mock';
import { mockExchanges, mockOneUsd } from '$tests/mocks/exchanges.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockTokens, mockValidToken } from '$tests/mocks/tokens.mock';
import type { MockedFunction } from 'vitest';

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

describe('tokens.utils', () => {
	describe('sortTokens', () => {
		it('should sort tokens by market cap, then by name, and finally by network name', () => {
			const $exchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
				[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
				[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd: mockOneUsd }
			};
			const sortedTokens = sortTokens({ $tokens: mockTokens, $exchanges, $tokensToPin: [] });

			expect(sortedTokens).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
		});

		it('should sort tokens with same market cap by name', () => {
			const $exchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
				[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
				[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd }
			};
			const sortedTokens = sortTokens({ $tokens: mockTokens, $exchanges, $tokensToPin: [] });

			expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
		});

		it('should sort tokens by name if market cap is not provided', () => {
			const $exchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd: mockOneUsd },
				[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
				[ETHEREUM_TOKEN.id]: { usd: mockOneUsd }
			};
			const sortedTokens = sortTokens({ $tokens: mockTokens, $exchanges, $tokensToPin: [] });

			expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
		});

		it('should sort tokens with same market cap and name by network name', () => {
			const newTokens: Token[] = mockTokens.map((token) => ({ ...token, name: 'Test Token' }));
			const $exchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
				[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
				[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd }
			};
			const sortedTokens = sortTokens({
				$tokens: newTokens,
				$exchanges,
				$tokensToPin: []
			});

			expect(sortedTokens).toEqual(
				[BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN].map((token) => ({
					...token,
					name: 'Test Token'
				}))
			);
		});

		it('should sort tokens with same name by network name if market cap is not provided', () => {
			const newTokens: Token[] = mockTokens.map((token) => ({ ...token, name: 'Test Token' }));
			const $exchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd: mockOneUsd },
				[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
				[ETHEREUM_TOKEN.id]: { usd: mockOneUsd }
			};
			const sortedTokens = sortTokens({
				$tokens: newTokens,
				$exchanges,
				$tokensToPin: []
			});

			expect(sortedTokens).toEqual(
				[BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN].map((token) => ({
					...token,
					name: 'Test Token'
				}))
			);
		});

		it('should pin tokens at the top of the list', () => {
			const $exchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
				[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
				[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd: mockOneUsd }
			};
			const tokensToPin: TokenToPin[] = [ETHEREUM_TOKEN, BTC_MAINNET_TOKEN];
			const sortedTokens = sortTokens({
				$tokens: mockTokens,
				$exchanges,
				$tokensToPin: tokensToPin
			});

			expect(sortedTokens).toEqual([ETHEREUM_TOKEN, BTC_MAINNET_TOKEN, ICP_TOKEN]);
		});

		it('should sort deprecated sns tokens at the end', () => {
			const mockDeprecatedTokenName = {
				...mockValidToken,
				deprecated: true
			};

			const mockTokensWithDeprecated = [mockDeprecatedTokenName, ...mockTokens];

			const sortedTokens = sortTokens({
				$tokens: mockTokensWithDeprecated,
				$exchanges: {},
				$tokensToPin: []
			});

			expect(sortedTokens).toEqual([
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				ICP_TOKEN,
				mockDeprecatedTokenName
			]);
		});
	});

	describe('pinTokensWithBalanceAtTop', () => {
		const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

		beforeEach(() => {
			vi.resetAllMocks();

			mockUsdValue.mockImplementation(
				({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
			);
		});

		it('should pin tokens with usd balance at the top and sort by usd balance', () => {
			const newBalances: CertifiedStoreData<BalancesData> = {
				[ICP_TOKEN.id]: { data: bn2Bi, certified },
				[BTC_MAINNET_TOKEN.id]: { data: bn1Bi, certified },
				[ETHEREUM_TOKEN.id]: { data: bn3Bi, certified }
			};

			const result = pinTokensWithBalanceAtTop({
				$tokens: mockTokens,
				$balances: newBalances,
				$exchanges: mockExchanges
			});

			expect(result.map((token) => token.id)).toEqual([
				ETHEREUM_TOKEN.id,
				ICP_TOKEN.id,
				BTC_MAINNET_TOKEN.id
			]);
		});

		it('should put tokens with no usd balance after the ones with and sort them by balance', () => {
			const newExchanges: ExchangesData = {
				[ICP_TOKEN.id]: { usd: mockOneUsd }
			};

			const result = pinTokensWithBalanceAtTop({
				$tokens: mockTokens,
				$balances: mockBalances,
				$exchanges: newExchanges
			});

			expect(result.map((token) => token.id)).toEqual([
				ICP_TOKEN.id,
				ETHEREUM_TOKEN.id,
				BTC_MAINNET_TOKEN.id
			]);
		});

		it('should return the same array if all tokens have no balance', () => {
			const newBalances: CertifiedStoreData<BalancesData> = {
				[ICP_TOKEN.id]: { data: ZERO, certified },
				[BTC_MAINNET_TOKEN.id]: { data: ZERO, certified },
				[ETHEREUM_TOKEN.id]: { data: ZERO, certified }
			};

			const result = pinTokensWithBalanceAtTop({
				$tokens: mockTokens,
				$balances: newBalances,
				$exchanges: mockExchanges
			});

			expect(result.map((token) => token.id)).toEqual([
				ICP_TOKEN.id,
				BTC_MAINNET_TOKEN.id,
				ETHEREUM_TOKEN.id
			]);
		});

		it('should sort only tokens with non-zero balances and leave untouched the rest', () => {
			const newBalances: CertifiedStoreData<BalancesData> = {
				[ICP_TOKEN.id]: { data: ZERO, certified },
				[BTC_MAINNET_TOKEN.id]: { data: bn1Bi, certified },
				[ETHEREUM_TOKEN.id]: { data: ZERO, certified }
			};

			const result = pinTokensWithBalanceAtTop({
				$tokens: mockTokens,
				$balances: newBalances,
				$exchanges: mockExchanges
			});

			expect(result.map((token) => token.id)).toEqual([
				BTC_MAINNET_TOKEN.id,
				ICP_TOKEN.id,
				ETHEREUM_TOKEN.id
			]);
		});

		it('should put tokens with no exchange data after tokens with balance', () => {
			const newBalances: CertifiedStoreData<BalancesData> = {
				[BTC_MAINNET_TOKEN.id]: { data: bn1Bi, certified },
				[ETHEREUM_TOKEN.id]: { data: bn3Bi, certified }
			};

			const result = pinTokensWithBalanceAtTop({
				$tokens: mockTokens,
				$balances: newBalances,
				$exchanges: mockExchanges
			});

			expect(result.map((token) => token.id)).toEqual([
				ETHEREUM_TOKEN.id,
				BTC_MAINNET_TOKEN.id,
				ICP_TOKEN.id
			]);
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
		const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

		beforeEach(() => {
			vi.resetAllMocks();

			mockUsdValue.mockImplementation(
				({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
			);
		});

		it('should return a dictionary with correct balances for the list of mainnet and testnet tokens', () => {
			const balances = {
				...mockBalances,
				[BTC_TESTNET_TOKEN.id]: { data: bn3Bi, certified }
			};
			const tokens = [...mockTokens, BTC_TESTNET_TOKEN];

			const result = sumMainnetTokensUsdBalancesPerNetwork({
				$tokens: tokens,
				$balances: balances,
				$exchanges: mockExchanges
			});

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(bn2Bi),
				[ETHEREUM_NETWORK_ID]: Number(bn3Bi),
				[ICP_NETWORK_ID]: Number(bn1Bi)
			});
		});

		it('should return a dictionary with correct balances if all token balances are 0', () => {
			const balances = {
				[ICP_TOKEN.id]: { data: ZERO, certified },
				[BTC_MAINNET_TOKEN.id]: { data: ZERO, certified },
				[ETHEREUM_TOKEN.id]: { data: ZERO, certified },
				[BTC_TESTNET_TOKEN.id]: { data: ZERO, certified }
			};
			const tokens = [...mockTokens, BTC_TESTNET_TOKEN];

			const result = sumMainnetTokensUsdBalancesPerNetwork({
				$tokens: tokens,
				$balances: balances,
				$exchanges: mockExchanges
			});

			expect(result).toEqual({
				[BTC_MAINNET_NETWORK_ID]: Number(ZERO),
				[ETHEREUM_NETWORK_ID]: Number(ZERO),
				[ICP_NETWORK_ID]: Number(ZERO)
			});
		});

		it('should return an empty dictionary if no mainnet tokens are in the list', () => {
			const balances = {
				...mockBalances,
				[BTC_TESTNET_TOKEN.id]: { data: bn2Bi, certified }
			};
			const tokens = [BTC_TESTNET_TOKEN];

			const result = sumMainnetTokensUsdBalancesPerNetwork({
				$tokens: tokens,
				$balances: balances,
				$exchanges: mockExchanges
			});

			expect(result).toEqual({});
		});

		it('should return an empty dictionary if no tokens are provided', () => {
			const result = sumMainnetTokensUsdBalancesPerNetwork({
				$tokens: [],
				$balances: mockBalances,
				$exchanges: mockExchanges
			});

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
		it('should filter tokens by symbol correctly when filter is provided', () => {
			expect(filterTokens({ tokens: mockTokens, filter: 'ICP' })).toStrictEqual([ICP_TOKEN]);
			expect(filterTokens({ tokens: mockTokens, filter: 'BTC' })).toStrictEqual([
				BTC_MAINNET_TOKEN
			]);
			expect(filterTokens({ tokens: mockTokens, filter: 'PEPE' })).toStrictEqual([]);
		});

		it('should filter tokens by name correctly when filter is provided', () => {
			expect(filterTokens({ tokens: mockTokens, filter: 'Bit' })).toStrictEqual([
				BTC_MAINNET_TOKEN
			]);
			expect(filterTokens({ tokens: mockTokens, filter: 'Eth' })).toStrictEqual([ETHEREUM_TOKEN]);
		});

		it('should filter tokens by twin token symbol correctly when filter is provided', () => {
			expect(
				filterTokens({ tokens: [...mockTokens, mockValidIcCkToken], filter: 'STK' })
			).toStrictEqual([mockValidIcCkToken]);
		});

		it('should filter tokens correctly when filter is not provided', () => {
			expect(filterTokens({ tokens: mockTokens, filter: '' })).toStrictEqual(mockTokens);
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
			vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValue(false);
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
				vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValueOnce(false);

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
					vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValueOnce(true);
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
});
