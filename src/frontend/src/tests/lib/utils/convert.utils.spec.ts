import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ZERO } from '$lib/constants/app.constants';
import { validateConvertAmount } from '$lib/utils/convert.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { BigNumber } from 'alchemy-sdk';

describe('validateConvertAmount', () => {
	const userAmount = BigNumber.from(200000n);
	const token = ETHEREUM_TOKEN;
	const balance = BigNumber.from(9000000n);
	const fee = 10000n;

	it('should return undefined if all data satisfies the conditions', () => {
		expect(
			validateConvertAmount({
				userAmount,
				token,
				balance,
				fee
			})
		).toBeUndefined();
	});

	it('should return insufficient funds error', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.add(userAmount),
				token,
				balance,
				fee
			})
		).toBe('insufficient-funds');
	});

	it('should return insufficient funds for fee error for an ETH token', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.sub(BigNumber.from(fee).div(2)),
				token: SEPOLIA_TOKEN,
				balance,
				fee
			})
		).toBe('insufficient-funds-for-fee');
	});

	it('should return insufficient funds for fee error for a ERC20 token', () => {
		expect(
			validateConvertAmount({
				userAmount,
				token: mockValidErc20Token,
				balance,
				ethBalance: ZERO,
				fee
			})
		).toBe('insufficient-funds-for-fee');
	});

	it('should return insufficient funds for fee error for a BTC token', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.sub(BigNumber.from(fee).div(2)),
				token: BTC_MAINNET_TOKEN,
				balance,
				fee
			})
		).toBe('insufficient-funds-for-fee');
	});

	it('should not return insufficient funds for fee error if totalFee is undefined', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.sub(BigNumber.from(fee).div(2)),
				token,
				balance
			})
		).toBeUndefined();
	});
});
