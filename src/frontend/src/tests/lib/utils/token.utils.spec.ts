import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { TokenStandard, TokenUi } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	calculateTokenUsdBalance,
	getMaxTransactionAmount,
	mapTokenUi,
	sumTokenBalances,
	sumUsdBalances
} from '$lib/utils/token.utils';
import { $balances, bn1, bn2, bn3 } from '$tests/mocks/balances.mock';
import { $exchanges } from '$tests/mocks/exchanges.mock';
import { BigNumber } from 'alchemy-sdk';
import { describe, expect, it, type MockedFunction } from 'vitest';

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
		const result = calculateTokenUsdBalance({ token: ETHEREUM_TOKEN, $balances, $exchanges });
		expect(result).toEqual(bn3.toNumber());
	});

	it('should return undefined if exchange rate is not available', () => {
		const result = calculateTokenUsdBalance({ token: ICP_TOKEN, $balances, $exchanges: {} });
		expect(result).toEqual(undefined);
	});

	it('should return 0 if balances store is not available', () => {
		const result = calculateTokenUsdBalance({ token: ETHEREUM_TOKEN, $balances: {}, $exchanges });
		expect(result).toEqual(0);
	});

	it('should return 0 if balances store is undefined', () => {
		const result = calculateTokenUsdBalance({
			token: ETHEREUM_TOKEN,
			$balances: undefined,
			$exchanges
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
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances, $exchanges });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: bn3.toNumber()
		});
	});

	it('should return an object TokenUi with undefined usdBalance if exchange rate is not available', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances, $exchanges: {} });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: undefined
		});
	});

	it('should return an object TokenUi with undefined balance if balances store is not initiated', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances: undefined, $exchanges });
		expect(result).toEqual({
			...ETHEREUM_TOKEN,
			balance: undefined,
			usdBalance: 0
		});
	});

	it('should return an object TokenUi with undefined balance if balances store is not available', () => {
		const result = mapTokenUi({ token: ETHEREUM_TOKEN, $balances: {}, $exchanges });
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
			$exchanges
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
