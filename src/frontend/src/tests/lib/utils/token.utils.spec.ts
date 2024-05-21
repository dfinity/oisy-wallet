import { getMaxTransactionAmount } from '$lib/utils/token.utils';

const tokenDecimals = 8;
const tokenStandard = 'erc20';

const balance = 1000000000n;
const fee = 10000000n;

describe('getMaxTransactionAmount', () => {
	it('should return the correct maximum amount for a transaction', () => {
		const result = getMaxTransactionAmount({
			balance,
			fee,
			tokenDecimals: tokenDecimals,
			tokenStandard: tokenStandard
		});
		expect(result).toBe(Number(balance - fee) / 10 ** tokenDecimals);
	});

	it('should return 0 if balance is less than fee', () => {
		const result = getMaxTransactionAmount({
			balance: fee,
			fee: balance,
			tokenDecimals: tokenDecimals,
			tokenStandard: tokenStandard
		});
		expect(result).toBe(0);
	});

	it('should return 0 if balance and fee are undefined', () => {
		const result = getMaxTransactionAmount({
			balance: undefined,
			fee: undefined,
			tokenDecimals: tokenDecimals,
			tokenStandard: tokenStandard
		});
		expect(result).toBe(0);
	});

	it('should handle balance or fee being undefined', () => {
		let result = getMaxTransactionAmount({
			balance: undefined,
			fee,
			tokenDecimals: tokenDecimals,
			tokenStandard: tokenStandard
		});
		expect(result).toBe(0);

		result = getMaxTransactionAmount({
			balance,
			fee: undefined,
			tokenDecimals: tokenDecimals,
			tokenStandard: tokenStandard
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});

	it('should return the untouched amount if the token is not ERC20', () => {
		const result = getMaxTransactionAmount({
			balance,
			fee,
			tokenDecimals: tokenDecimals,
			tokenStandard: 'not-erc20'
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});
});
