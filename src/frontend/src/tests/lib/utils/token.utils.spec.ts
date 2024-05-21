import type { TokenStandard } from '$lib/types/token';
import { getMaxTransactionAmount } from '$lib/utils/token.utils';

const tokenDecimals = 8;
const tokenStandards: TokenStandard[] = ['ethereum', 'icp', 'icrc', 'bitcoin'];

const balance = 1000000000n;
const fee = 10000000n;

describe('getMaxTransactionAmount', () => {
	it('should return the correct maximum amount for a transaction for each token standard', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				balance,
				fee,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(Number(balance - fee) / 10 ** tokenDecimals);
		});
	});

	it('should return 0 if balance is less than fee', () => {
		tokenStandards.forEach((tokenStandard) => {
			const result = getMaxTransactionAmount({
				balance: fee,
				fee: balance,
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
				fee,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(0);

			result = getMaxTransactionAmount({
				balance,
				fee: undefined,
				tokenDecimals,
				tokenStandard
			});
			expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
		});
	});

	it('should return the untouched amount if the token is ERC20', () => {
		const result = getMaxTransactionAmount({
			balance,
			fee,
			tokenDecimals: tokenDecimals,
			tokenStandard: 'erc20'
		});
		expect(result).toBe(Number(balance) / 10 ** tokenDecimals);
	});
});
