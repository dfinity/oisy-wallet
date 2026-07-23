import { ICP_TOKEN as ICP_ETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.icp.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { USD1_TOKEN as USD1_ETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.usd1.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { ICP_TOKEN as ICP_ARB_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.icp.env';
import { USDC_TOKEN as USDC_ARBITRUM_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN as USDT_ARBITRUM_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdt.env';
import { ICP_TOKEN as ICP_BASE_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.icp.env';
import { USDC_TOKEN as USDC_BASE_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { USD1_TOKEN as USD1_BSC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usd1.env';
import { USDC_TOKEN as USDC_BSC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { USDT_TOKEN as USDT_BSC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdt.env';
import { USDC_TOKEN as USDC_POLYGON_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN as USDT_POLYGON_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdt.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import * as tokensIcrcCkEnv from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { USD1_TOKEN as USD1_SOL_TOKEN } from '$env/tokens/tokens-spl/tokens.usd1.env';
import { USDC_TOKEN as USDC_SOL_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { USDT_TOKEN as USDT_SOL_TOKEN } from '$env/tokens/tokens-spl/tokens.usdt.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ckErc20Production } from '$env/tokens/tokens.ckerc20.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcCkToken } from '$icp/types/ic-token';
import type { StakeBalances } from '$lib/types/stake-balance';
import type { TokenStandardCode } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	calculateTokenUsdAmount,
	calculateTokenUsdBalance,
	filterEnabledToken,
	findTwinToken,
	getMaxTransactionAmount,
	getTokenDisplayName,
	getTokenDisplaySymbol,
	isUSD1Token,
	mapDefaultTokenToToggleable,
	mapTokenUi,
	sumUsdBalances
} from '$lib/utils/token.utils';
import { bn3Bi, mockBalances } from '$tests/mocks/balances.mock';
import { mockExchanges } from '$tests/mocks/exchanges.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';

const tokenDecimals = 8;
const tokenStandards: TokenStandardCode[] = ['ethereum', 'icp', 'icrc', 'bitcoin'];

const balance = 1000000000n;
const fee = 10000000n;

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

describe('token.utils', () => {
	describe('getMaxTransactionAmount', () => {
		it('should return the correct maximum amount for a transaction for each token standard', () => {
			tokenStandards.forEach((tokenStandard) => {
				const result = getMaxTransactionAmount({
					balance,
					fee,
					tokenDecimals,
					tokenStandard: { code: tokenStandard }
				});

				expect(result).toBe((Number(balance - fee) / 10 ** tokenDecimals).toString());
			});
		});

		it('should return 0 if balance is less than fee', () => {
			tokenStandards.forEach((tokenStandard) => {
				const result = getMaxTransactionAmount({
					fee: balance,
					balance: fee,
					tokenDecimals,
					tokenStandard: { code: tokenStandard }
				});

				expect(result).toBe('0');
			});
		});

		it('should return 0 if balance and fee are undefined', () => {
			tokenStandards.forEach((tokenStandard) => {
				const result = getMaxTransactionAmount({
					balance: undefined,
					fee: undefined,
					tokenDecimals,
					tokenStandard: { code: tokenStandard }
				});

				expect(result).toBe('0');
			});
		});

		it('should handle balance or fee being undefined', () => {
			tokenStandards.forEach((tokenStandard) => {
				let result = getMaxTransactionAmount({
					balance: undefined,
					fee,
					tokenDecimals,
					tokenStandard: { code: tokenStandard }
				});

				expect(result).toBe('0');

				result = getMaxTransactionAmount({
					balance,
					fee: undefined,
					tokenDecimals,
					tokenStandard: { code: tokenStandard }
				});

				expect(result).toBe((Number(balance) / 10 ** tokenDecimals).toString());
			});
		});

		it('should return the untouched amount if the token is ERC20', () => {
			const result = getMaxTransactionAmount({
				balance,
				fee,
				tokenDecimals,
				tokenStandard: { code: 'erc20' }
			});

			expect(result).toBe((Number(balance) / 10 ** tokenDecimals).toString());
		});

		it('should return the untouched amount if the token is ERC4626', () => {
			const result = getMaxTransactionAmount({
				balance,
				fee,
				tokenDecimals,
				tokenStandard: { code: 'erc4626' }
			});

			expect(result).toBe((Number(balance) / 10 ** tokenDecimals).toString());
		});

		it('should return the untouched amount if the token is SPL', () => {
			const result = getMaxTransactionAmount({
				balance,
				fee,
				tokenDecimals,
				tokenStandard: { code: 'spl' }
			});

			expect(result).toBe((Number(balance) / 10 ** tokenDecimals).toString());
		});
	});

	describe('calculateTokenUsdBalance', () => {
		const mockUsdValue = vi.mocked(usdValue);

		beforeEach(() => {
			vi.resetAllMocks();

			mockUsdValue.mockImplementation(
				({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
			);
		});

		it('should correctly calculate USD balance for the token', () => {
			const result = calculateTokenUsdBalance({
				token: ETHEREUM_TOKEN,
				$balances: mockBalances,
				$exchanges: mockExchanges
			});

			expect(result).toEqual(Number(bn3Bi));
		});

		it('should return undefined if exchange rate is not available', () => {
			const result = calculateTokenUsdBalance({
				token: ICP_TOKEN,
				$balances: mockBalances,
				$exchanges: {}
			});

			expect(result).toEqual(undefined);
		});

		it('should return 0 if balances store is not available', () => {
			const result = calculateTokenUsdBalance({
				token: ETHEREUM_TOKEN,
				$balances: {},
				$exchanges: mockExchanges
			});

			expect(result).toEqual(0);
		});

		it('should return 0 if balances store is undefined', () => {
			const result = calculateTokenUsdBalance({
				token: ETHEREUM_TOKEN,
				$balances: undefined,
				$exchanges: mockExchanges
			});

			expect(result).toEqual(0);
		});
	});

	describe('calculateTokenUsdAmount', () => {
		const mockUsdValue = vi.mocked(usdValue);

		beforeEach(() => {
			vi.resetAllMocks();

			mockUsdValue.mockImplementation(
				({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
			);
		});

		it('should correctly calculate USD amount for the token and amount', () => {
			const result = calculateTokenUsdAmount({
				token: ICP_TOKEN,
				amount: bn3Bi,
				$exchanges: mockExchanges
			});

			expect(result).toEqual(Number(bn3Bi));
		});

		it('should return undefined if exchange rate is not available', () => {
			const result = calculateTokenUsdAmount({
				token: ICP_TOKEN,
				amount: bn3Bi,
				$exchanges: {}
			});

			expect(result).toEqual(undefined);
		});

		it('should return 0 if amount is not available', () => {
			const result = calculateTokenUsdAmount({
				token: ICP_TOKEN,
				amount: undefined,
				$exchanges: mockExchanges
			});

			expect(result).toEqual(0);
		});
	});

	describe('mapTokenUi', () => {
		const mockUsdValue = vi.mocked(usdValue);

		const mockStakeBalances: StakeBalances = {
			[ETHEREUM_TOKEN_ID]: { staked: 123n, claimable: 456n }
		};

		const mockParams = {
			token: ETHEREUM_TOKEN,
			$balances: mockBalances,
			$stakeBalances: mockStakeBalances,
			$exchanges: mockExchanges
		};

		const expected: TokenUi = {
			...ETHEREUM_TOKEN,
			balance: bn3Bi,
			usdBalance: Number(bn3Bi),
			usdPrice: mockExchanges?.[ETHEREUM_TOKEN.id]?.usd,
			usdMarketCap: mockExchanges?.[ETHEREUM_TOKEN.id]?.usd_market_cap,
			usdPriceChangePercentage24h: mockExchanges?.[ETHEREUM_TOKEN.id]?.usd_24h_change,
			stakeBalance: 123n,
			stakeUsdBalance: Number(123n),
			claimableStakeBalance: 456n,
			claimableStakeBalanceUsd: Number(456n)
		};

		beforeEach(() => {
			vi.resetAllMocks();

			mockUsdValue.mockImplementation(
				({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
			);
		});

		it('should return an object TokenUi with the correct values', () => {
			const result = mapTokenUi(mockParams);

			expect(result).toEqual(expected);
		});

		it('should return an object TokenUi with undefined usdBalance if exchange rate is not available', () => {
			const result = mapTokenUi({
				...mockParams,
				$exchanges: {}
			});

			expect(result).toEqual({
				...expected,
				usdBalance: undefined,
				usdPrice: undefined,
				usdMarketCap: undefined,
				usdPriceChangePercentage24h: undefined,
				stakeUsdBalance: undefined,
				claimableStakeBalanceUsd: undefined
			});
		});

		it('should return an object TokenUi with undefined balance if balances store is not initiated', () => {
			const result = mapTokenUi({
				...mockParams,
				$balances: undefined
			});

			expect(result).toEqual({
				...expected,
				balance: undefined,
				usdBalance: 0
			});
		});

		it('should return an object TokenUi with undefined balance if balances store is not available', () => {
			const result = mapTokenUi({
				...mockParams,
				$balances: {}
			});

			expect(result).toEqual({
				...expected,
				balance: undefined,
				usdBalance: 0
			});
		});

		it('should return an object TokenUi with null balance if balances data is null', () => {
			const result = mapTokenUi({
				...mockParams,
				$balances: { [ETHEREUM_TOKEN.id]: null }
			});

			expect(result).toEqual({
				...expected,
				balance: null,
				usdBalance: 0
			});
		});

		it('should return an object TokenUi with undefined stake balances if stake balances store is not available', () => {
			const result = mapTokenUi({
				...mockParams,
				$stakeBalances: {}
			});

			expect(result).toEqual({
				...expected,
				stakeBalance: undefined,
				stakeUsdBalance: undefined,
				claimableStakeBalance: undefined,
				claimableStakeBalanceUsd: undefined
			});
		});

		it('should return an object TokenUi with undefined stake balance if stake balance is not available', () => {
			const result = mapTokenUi({
				...mockParams,
				$stakeBalances: {
					...mockStakeBalances,
					[ETHEREUM_TOKEN_ID]: { ...mockStakeBalances[ETHEREUM_TOKEN_ID], staked: undefined }
				}
			});

			expect(result).toEqual({
				...expected,
				stakeBalance: undefined,
				stakeUsdBalance: undefined
			});
		});

		it('should return an object TokenUi with undefined claimable balance if claimable balance is not available', () => {
			const result = mapTokenUi({
				...mockParams,
				$stakeBalances: {
					...mockStakeBalances,
					[ETHEREUM_TOKEN_ID]: { ...mockStakeBalances[ETHEREUM_TOKEN_ID], claimable: undefined }
				}
			});

			expect(result).toEqual({
				...expected,
				claimableStakeBalance: undefined,
				claimableStakeBalanceUsd: undefined
			});
		});
	});

	describe('sumUsdBalances', () => {
		it('should sum token balances when both balances are non-null', () => {
			const result = sumUsdBalances([100, 200]);

			expect(result).toEqual(300);
		});

		it('should return the first balance when the second balance is nullish', () => {
			expect(sumUsdBalances([100, undefined])).toBe(100);
		});

		it('should return the second balance when the first balance is nullish', () => {
			expect(sumUsdBalances([undefined, 200])).toBe(200);
		});

		it('should return undefined when both balances are nullish', () => {
			expect(sumUsdBalances([undefined, undefined])).toBeUndefined();
		});
	});

	describe('findTwinToken', () => {
		const ckBtcToken = {
			...mockValidIcCkToken,
			symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
		} as IcCkToken;

		it('should return correct twin token', () => {
			const result = findTwinToken({
				tokens: [...mockTokens, ckBtcToken],
				tokenToPair: BTC_MAINNET_TOKEN
			});

			expect(result).toBe(ckBtcToken);
		});

		it('should return undefined if no twin token found', () => {
			const result = findTwinToken({
				tokens: [...mockTokens, ckBtcToken],
				tokenToPair: ETHEREUM_TOKEN
			});

			expect(result).toBe(undefined);
		});

		it('should return undefined if tokenToPair does not contain twinTokenSymbol', () => {
			const { twinTokenSymbol: _, ...tokenWithoutTwinTokenSymbol } = BTC_MAINNET_TOKEN;

			const result = findTwinToken({
				tokens: [...mockTokens, ckBtcToken],
				tokenToPair: tokenWithoutTwinTokenSymbol
			});

			expect(result).toBe(undefined);
		});
	});

	describe('mapDefaultTokenToToggleable', () => {
		beforeEach(() => vi.clearAllMocks());

		const setupDefaultTokenMock = (canisterId?: string) => {
			vi.spyOn(
				tokensIcrcCkEnv,
				'ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS',
				'get'
			).mockReturnValue([canisterId ?? '']);
		};

		const setupSuggestedTokenMock = (canisterId?: string) => {
			vi.spyOn(
				tokensIcrcCkEnv,
				'ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS',
				'get'
			).mockReturnValue([canisterId ?? '']);
		};

		const dummyCkBTC = { ...mockValidIcToken, ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID };
		const dummyCkETH = { ...mockValidIcToken, ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID };
		const ckUSDCLedgerCanisterId = ckErc20Production.ckUSDC?.ledgerCanisterId;
		const dummyCkUSDC = { ...mockValidIcToken, ledgerCanisterId: ckUSDCLedgerCanisterId };

		describe.each([
			{ description: 'LINK token', token: LINK_TOKEN },
			{
				description: 'Dummy ck token',
				token: { ...mockValidIcToken, ledgerCanisterId: 'etik7-oiaaa-aaaar-qagia-cai' }
			},
			{
				// 1Sec-bridged USDC ICRC ledger on ICP (introduced in #12456, removed from
				// ICRC_SUGGESTED_LEDGER_CANISTER_IDS in this PR). Pinned here so a future
				// re-addition to the suggested list trips an assertion instead of silently
				// re-enabling the token by default for new users.
				description: '1Sec USDC ICRC ledger on ICP',
				token: { ...mockValidIcToken, ledgerCanisterId: '53nhb-haaaa-aaaar-qbn5q-cai' }
			},
			{
				// Same intent as above for the 1Sec-bridged USDT ICRC ledger on ICP.
				description: '1Sec USDT ICRC ledger on ICP',
				token: { ...mockValidIcToken, ledgerCanisterId: 'ij33n-oiaaa-aaaar-qbooa-cai' }
			}
		])(
			'Every other random token is only enabled if the user enables it - $description',
			({ token }) => {
				it('should enable the token if user enables it', () => {
					const result = mapDefaultTokenToToggleable({
						defaultToken: token,
						customToken: { ...token, enabled: true }
					});

					expect(result.enabled).toBeTruthy();
				});

				it('should not enable the token if user has not enabled it', () => {
					const result = mapDefaultTokenToToggleable({
						defaultToken: token,
						customToken: { ...token, enabled: false }
					});

					expect(result.enabled).toBeFalsy();
				});

				it('should not enable the token if customToken is undefined', () => {
					const result = mapDefaultTokenToToggleable({
						defaultToken: token,
						customToken: undefined
					});

					expect(result.enabled).toBeFalsy();
				});
			}
		);

		describe.each([
			{
				description: 'Default ICRC token ckBTC',
				token: dummyCkBTC,
				setupMock: setupDefaultTokenMock
			},
			{
				description: 'Default ICRC token ckETH',
				token: dummyCkETH,
				setupMock: setupDefaultTokenMock
			},
			{
				description: 'Suggested ICRC token ckUSDC',
				token: dummyCkUSDC,
				setupMock: setupDefaultTokenMock
			}
		])('$description - Default/Suggested Tokens', ({ token, setupMock }) => {
			beforeEach(() => setupMock(token.ledgerCanisterId));

			it('should enable the token if no customToken', () => {
				const result = mapDefaultTokenToToggleable({ defaultToken: token, customToken: undefined });

				expect(result.enabled).toBeTruthy();
			});

			it('should enable the token if customToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					customToken: { ...token, enabled: false }
				});

				expect(result.enabled).toBeTruthy();
			});

			it('should enable the token if customToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					customToken: { ...token, enabled: true }
				});

				expect(result.enabled).toBeTruthy();
			});
		});

		const dummyCkUSDT = {
			...mockValidIcToken,
			ledgerCanisterId: ckErc20Production.ckUSDT?.ledgerCanisterId
		};

		describe.each([
			{
				description: 'Suggested ICRC token ckUSDT',
				token: dummyCkUSDT,
				setupMock: setupSuggestedTokenMock
			},
			{ description: 'Suggested ERC20 token USDC', token: USDC_TOKEN },
			{ description: 'Suggested ERC20 token USDT', token: USDT_TOKEN },
			{ description: 'Suggested ERC20 token ICP on Ethereum', token: ICP_ETH_TOKEN },
			{ description: 'Suggested ERC20 token ICP on Arbitrum', token: ICP_ARB_TOKEN },
			{ description: 'Suggested ERC20 token ICP on Base', token: ICP_BASE_TOKEN },
			{ description: 'Suggested ERC20 token USDC on Arbitrum', token: USDC_ARBITRUM_TOKEN },
			{ description: 'Suggested ERC20 token USDT0 on Arbitrum', token: USDT_ARBITRUM_TOKEN },
			{ description: 'Suggested ERC20 token USDC on Base', token: USDC_BASE_TOKEN },
			{ description: 'Suggested ERC20 token USDC on BSC', token: USDC_BSC_TOKEN },
			{ description: 'Suggested ERC20 token USDT on BSC', token: USDT_BSC_TOKEN },
			{ description: 'Suggested ERC20 token USDC on Polygon', token: USDC_POLYGON_TOKEN },
			{ description: 'Suggested ERC20 token USDT on Polygon', token: USDT_POLYGON_TOKEN },
			{ description: 'Suggested SPL token USDC on Solana', token: USDC_SOL_TOKEN },
			{ description: 'Suggested SPL token USDT on Solana', token: USDT_SOL_TOKEN }
		])('$description - Suggested Tokens', ({ token, setupMock }) => {
			if (setupMock) {
				beforeEach(() => setupMock(token.ledgerCanisterId));
			}

			it('should enable the token if no customToken', () => {
				const result = mapDefaultTokenToToggleable({ defaultToken: token, customToken: undefined });

				expect(result.enabled).toBeTruthy();
			});

			it('should not enable the token if customToken has enabled false', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					customToken: { ...token, enabled: false }
				});

				expect(result.enabled).toBeFalsy();
			});

			it('should enable the token if customToken has enabled true', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					customToken: { ...token, enabled: true }
				});

				expect(result.enabled).toBeTruthy();
			});
		});
	});

	describe('getTokenDisplaySymbol', () => {
		it('should return oisy symbol if exists', () => {
			const oisySymbol = 'OISY';

			const result = getTokenDisplaySymbol({ ...mockIcrcCustomToken, oisySymbol: { oisySymbol } });

			expect(result).toBe(oisySymbol);
		});

		it('should return token symbol if oisy symbol does not exist', () => {
			const result = getTokenDisplaySymbol(mockIcrcCustomToken);

			expect(result).toBe(mockIcrcCustomToken.symbol);
		});
	});

	describe('getTokenDisplayName', () => {
		it('should return oisy name if exists', () => {
			const oisyName = 'OISY Name';

			const result = getTokenDisplayName({
				...mockIcrcCustomToken,
				oisyName: { oisyName }
			});

			expect(result).toBe(oisyName);
		});

		it('should return token name if oisy name does not exist', () => {
			const result = getTokenDisplayName(mockIcrcCustomToken);

			expect(result).toBe(mockIcrcCustomToken.name);
		});
	});

	describe('filterEnabledToken', () => {
		it('should return true if token has property `enabled` as true', () => {
			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: true })).toBeTruthy();
		});

		it('should return false if token has property `enabled` as false', () => {
			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: false })).toBeFalsy();
		});

		it('should return true if token has no property `enabled`', () => {
			expect(filterEnabledToken(ICP_TOKEN)).toBeTruthy();
		});

		it('should return false if token has nullish `enabled`', () => {
			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: undefined })).toBeFalsy();

			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: null })).toBeFalsy();
		});

		it('should return true if token has property `enabled` but not boolean', () => {
			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: 123 })).toBeTruthy();

			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: 'random-string' })).toBeTruthy();

			expect(filterEnabledToken({ ...ICP_TOKEN, enabled: {} })).toBeTruthy();
		});
	});

	describe('isUSD1Token', () => {
		it('should return true for USD1 on all its networks', () => {
			expect(isUSD1Token(USD1_ETH_TOKEN)).toBeTruthy();
			expect(isUSD1Token(USD1_BSC_TOKEN)).toBeTruthy();
			expect(isUSD1Token(USD1_SOL_TOKEN)).toBeTruthy();
		});

		it('should return false for other tokens', () => {
			expect(isUSD1Token(USDC_TOKEN)).toBeFalsy();
			expect(isUSD1Token(USDT_TOKEN)).toBeFalsy();
			expect(isUSD1Token(ICP_TOKEN)).toBeFalsy();
		});
	});
});
