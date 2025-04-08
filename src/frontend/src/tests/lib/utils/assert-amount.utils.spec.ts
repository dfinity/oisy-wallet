import {
	assertAmount,
	assertCkBtcAmount,
	assertCkErc20Amount,
	assertCkEthAmount,
	assertErc20Amount
} from '$lib/utils/assert-amount.utils';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import type { MinterInfo as CkBtcMinterInfo } from '@dfinity/ckbtc';
import type { MinterInfo as CkEthMinterInfo } from '@dfinity/cketh';

describe('asserts-amount.utils', () => {
	describe('assertAmount', () => {
		const params = {
			userAmount: 1000n,
			balance: 2000n,
			fee: 100n
		};

		it('should return balance error', () => {
			expect(
				assertAmount({
					...params,
					balance: 900n
				})
			).toBe('insufficient-funds');
		});

		it('should return funds for fee error', () => {
			expect(
				assertAmount({
					...params,
					balance: 1050n
				})
			).toBe('insufficient-funds-for-fee');
		});

		it('should return undefined', () => {
			expect(assertAmount(params)).toBeUndefined();
		});
	});

	describe('assertErc20Amount', () => {
		const params = {
			userAmount: 1000n,
			balance: 2000n,
			balanceForFee: 1000n,
			fee: 100n
		};

		it('should return balance error', () => {
			expect(
				assertErc20Amount({
					...params,
					balance: 900n
				})
			).toBe('insufficient-funds');
		});

		it('should return funds for fee error', () => {
			expect(
				assertErc20Amount({
					...params,
					balanceForFee: 50n
				})
			).toBe('insufficient-funds-for-fee');
		});

		it('should return undefined', () => {
			expect(assertErc20Amount(params)).toBeUndefined();
		});
	});

	describe('assertCkBtcAmount', () => {
		const params = {
			userAmount: 1000n,
			balance: 2000n,
			fee: 100n,
			minterInfo: { data: mockCkBtcMinterInfo, certified: true }
		};

		it('should return balance error', () => {
			expect(
				assertCkBtcAmount({
					...params,
					balance: 900n
				})
			).toBe('insufficient-funds');
		});

		it('should return funds for fee error', () => {
			expect(
				assertCkBtcAmount({
					...params,
					balance: 1050n
				})
			).toBe('insufficient-funds-for-fee');
		});

		it('should return unknown minimum amount error', () => {
			expect(
				assertCkBtcAmount({
					...params,
					minterInfo: undefined
				})
			).toBe('unknown-minimum-amount');
		});

		it('should return minimum amount not reached error', () => {
			expect(
				assertCkBtcAmount({
					...params,
					minterInfo: {
						...params.minterInfo,
						data: {
							...params.minterInfo.data,
							retrieve_btc_min_amount: 5000n
						} as CkBtcMinterInfo
					}
				})
			).toBe('minimum-amount-not-reached');
		});

		it('should return minter info not certified error', () => {
			expect(
				assertCkBtcAmount({
					...params,
					minterInfo: {
						...params.minterInfo,
						certified: false
					}
				})
			).toBe('minter-info-not-certified');
		});

		it('should return undefined', () => {
			expect(assertCkBtcAmount(params)).toBeUndefined();
		});
	});

	describe('assertCkEthAmount', () => {
		const params = {
			userAmount: 1000n,
			balance: 2000n,
			fee: 100n,
			minterInfo: {
				data: { minimum_withdrawal_amount: [500n] } as CkEthMinterInfo,
				certified: true
			}
		};

		it('should return balance error', () => {
			expect(
				assertCkEthAmount({
					...params,
					balance: 900n
				})
			).toBe('insufficient-funds');
		});

		it('should return funds for fee error', () => {
			expect(
				assertCkEthAmount({
					...params,
					balance: 1050n
				})
			).toBe('insufficient-funds-for-fee');
		});

		it('should return user amount less than fee error', () => {
			expect(
				assertCkEthAmount({
					...params,
					userAmount: 50n
				})
			).toBe('minimum-amount-not-reached');
		});

		it('should return unknown minimum amount error', () => {
			expect(
				assertCkEthAmount({
					...params,
					minterInfo: undefined
				})
			).toBe('unknown-minimum-amount');
		});

		it('should return minimum amount not reached error', () => {
			expect(
				assertCkEthAmount({
					...params,
					minterInfo: {
						...params.minterInfo,
						data: {
							...params.minterInfo.data,
							minimum_withdrawal_amount: [5000n]
						} as CkEthMinterInfo
					}
				})
			).toBe('minimum-amount-not-reached');
		});

		it('should return minter info not certified error', () => {
			expect(
				assertCkBtcAmount({
					...params,
					minterInfo: {
						...params.minterInfo,
						certified: false
					}
				})
			).toBe('minter-info-not-certified');
		});

		it('should return undefined', () => {
			expect(assertCkBtcAmount(params)).toBeUndefined();
		});
	});

	describe('assertCkErc20Amount', () => {
		const params = {
			userAmount: 1000n,
			balance: 2000n,
			balanceForFee: 1000n,
			ethereumEstimateFee: 500n,
			fee: 100n
		};

		it('should return balance error', () => {
			expect(
				assertCkErc20Amount({
					...params,
					balance: 900n
				})
			).toBe('insufficient-funds');
		});

		it('should return funds for fee error if balance cannot cover IC token fee', () => {
			expect(
				assertCkErc20Amount({
					...params,
					balance: 1050n
				})
			).toBe('insufficient-funds-for-fee');
		});

		it('should return funds for fee error if balanceForFee cannot cover ethereumEstimateFee', () => {
			expect(
				assertCkErc20Amount({
					...params,
					ethereumEstimateFee: 4000n
				})
			).toBe('insufficient-funds-for-fee');
		});

		it('should return undefined', () => {
			expect(assertCkErc20Amount(params)).toBeUndefined();
		});
	});
});
