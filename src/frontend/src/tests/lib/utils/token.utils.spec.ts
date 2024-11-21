import * as NetworksModule from '$env/networks.icrc.env';
import { IC_CKBTC_LEDGER_CANISTER_ID, IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import { LINK_TOKEN } from '$env/tokens-erc20/tokens.link.env';
import { USDC_TOKEN } from '$env/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens-erc20/tokens.usdt.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ckErc20Production } from '$env/tokens.ckerc20.env';
import { ICP_TOKEN } from '$env/tokens.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { IcCkToken } from '$icp/types/ic-token';
import type { TokenStandard, TokenUi } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	calculateTokenUsdBalance,
	findTwinToken,
	getMaxTransactionAmount,
	mapDefaultTokenToToggleable,
	mapTokenUi,
	sumTokenBalances,
	sumUsdBalances
} from '$lib/utils/token.utils';
import { bn1, bn2, bn3, mockBalances } from '$tests/mocks/balances.mock';
import { mockExchanges } from '$tests/mocks/exchanges.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import { BigNumber } from 'alchemy-sdk';
import type { MockedFunction } from 'vitest';

const tokenDecimals = 8;
const tokenStandards: TokenStandard[] = ['ethereum', 'icp', 'icrc', 'bitcoin'];

const balance = 1000000000n;
const fee = 10000000n;

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

describe('getMaxTransactionAmount', () => {
	it('should return the correct maximum amount for a transaction for each token standard', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				balance: BigNumber.from(balance),
				fee: BigNumber.from(fee),
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(Number(balance - fee) / 10 ** tokenDecimals);
		});
	});

	it('should return 0 if balance is less than fee', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				fee: BigNumber.from(balance),
				balance: BigNumber.from(fee),
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);
		});
	});

	it('should return 0 if balance and fee are undefined', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				balance: undefined,
				fee: undefined,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);
		});
	});

	it('should handle balance or fee being undefined', () => {
		tokenStandards.forEach((tokenStandard) => {
			let result = getMaxTransactionAmount({
				balance: undefined,
				fee: BigNumber.from(fee),
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);

			result = getMaxTransactionAmount({
				balance: BigNumber.from(balance),
				fee: undefined,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
		});
	});

	it('should return the untouched amount if the token is ERC20', () => {
		const result = getMaxTransactionAmount({
			balance: BigNumber.from(balance),
			fee: BigNumber.from(fee),
			tokenDecimals: tokenDecimals,
			tokenStandard: 'erc20'
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});
});

describe('calculateTokenUsdBalance', () => {
	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

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
		expect(result).toEqual(bn3.toNumber());
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

describe('mapTokenUi', () => {
	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsdValue.mockImplementation(
			({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
		);
	});

	it('should return an object TokenUi with the correct values', () => {
		const result = mapTokenUi({
			token: ETHEREUM_TOKEN,
			$balances: mockBalances,
			$exchanges: mockExchanges
		});
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: bn3.toNumber()
		});
	});

	it('should return an object TokenUi with undefined usdBalance if exchange rate is not available', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances: mockBalances, $exchanges: {} });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: undefined
		});
	});

	it('should return an object TokenUi with undefined balance if balances store is not initiated', () => {
		const result = mapTokenUi({
			token: ETHEREUM_TOKEN,
			$balances: undefined,
			$exchanges: mockExchanges
		});
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: undefined,
			usdBalance: 0
		});
	});

	it('should return an object TokenUi with undefined balance if balances store is not available', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances: {}, $exchanges: mockExchanges });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: undefined,
			usdBalance: 0
		});
	});

	it('should return an object TokenUi with null balance if balances data is null', () => {
		const result = mapTokenUi({
			token: ETHEREUM_TOKEN,
			$balances: { [ETHEREUM_TOKEN.id]: null },
			$exchanges: mockExchanges
		});
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: null,
			usdBalance: 0
		});
	});
});

describe('sumTokenBalances', () => {
	// We mock ETH to be a twin of ICP
	const token1: TokenUi = { ...ICP_TOKEN, balance: bn1, decimals: 18 };
	const token2: TokenUi = { ...ETHEREUM_TOKEN, balance: bn2, decimals: 18 };

	it('should sum token balances when both balances are non-null and decimals match', () => {
		const result = sumTokenBalances([token1, token2]);

		expect(result).toStrictEqual(bn1.add(bn2));
	});

	it('should return null when decimals do not match', () => {
		expect(sumTokenBalances([token1, { ...token2, decimals: 8 }])).toBeNull();
	});

	it('should return the first balance when the second balance is nullish', () => {
		expect(sumTokenBalances([token1, { ...token2, balance: null }])).toBe(bn1);
	});

	it('should return the second balance when the first balance is nullish', () => {
		expect(sumTokenBalances([{ ...token1, balance: null }, token2])).toBe(bn2);
	});

	it('should return the first balance nullish value when both balances are nullish but not undefined', () => {
		expect(
			sumTokenBalances([
				{ ...token1, balance: null },
				{ ...token2, balance: null }
			])
		).toBeNull();
	});

	it('should return undefined when one of the balances is undefined', () => {
		expect(sumTokenBalances([token1, { ...token2, balance: undefined }])).toBeUndefined();

		expect(sumTokenBalances([{ ...token1, balance: undefined }, token2])).toBeUndefined();
	});

	it('should return undefined when both balances are undefined', () => {
		expect(
			sumTokenBalances([
				{ ...token1, balance: undefined },
				{ ...token2, balance: undefined }
			])
		).toBeUndefined();
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
			NetworksModule,
			'ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS',
			'get'
		).mockReturnValue([canisterId ?? '']);
	};

	const setupSuggestedTokenMock = (canisterId?: string) => {
		vi.spyOn(
			NetworksModule,
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
		}
	])(
		'Every other random token is only enabled if the user enables it - $description',
		({ token }) => {
			it('should enable the token if user enables it', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					userToken: { ...token, enabled: true }
				});

				expect(result.enabled).toEqual(true);
			});

			it('should not enable the token if user has not enabled it', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					userToken: { ...token, enabled: false }
				});

				expect(result.enabled).toEqual(false);
			});

			it('should not enable the token if userToken is undefined', () => {
				const result = mapDefaultTokenToToggleable({
					defaultToken: token,
					userToken: undefined
				});

				expect(result.enabled).toEqual(false);
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

		it('should enable the token if no userToken', () => {
			const result = mapDefaultTokenToToggleable({ defaultToken: token, userToken: undefined });
			expect(result.enabled).toEqual(true);
		});

		it('should enable the token if userToken has enabled false', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: token,
				userToken: { ...token, enabled: false }
			});
			expect(result.enabled).toEqual(true);
		});

		it('should enable the token if userToken has enabled true', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: token,
				userToken: { ...token, enabled: true }
			});
			expect(result.enabled).toEqual(true);
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
		{ description: 'Suggested ERC20 token USDT', token: USDT_TOKEN }
	])('$description - Suggested Tokens', ({ token, setupMock }) => {
		if (setupMock) {
			beforeEach(() => setupMock(token.ledgerCanisterId));
		}

		it('should enable the token if no userToken', () => {
			const result = mapDefaultTokenToToggleable({ defaultToken: token, userToken: undefined });
			expect(result.enabled).toEqual(true);
		});

		it('should not enable the token if userToken has enabled false', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: token,
				userToken: { ...token, enabled: false }
			});
			expect(result.enabled).toEqual(false);
		});

		it('should enable the token if userToken has enabled true', () => {
			const result = mapDefaultTokenToToggleable({
				defaultToken: token,
				userToken: { ...token, enabled: true }
			});
			expect(result.enabled).toEqual(true);
		});
	});
});
