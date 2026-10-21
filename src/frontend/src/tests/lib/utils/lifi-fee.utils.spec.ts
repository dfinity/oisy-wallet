import { ZERO } from '$lib/constants/app.constants';
import {
	isLifiFeeAffordable,
	lifiApprovalCount,
	lifiQuoteGas,
	lifiUnsignedTxSize,
	withLifiGasBuffer
} from '$lib/utils/lifi-fee.utils';
import { mockLifiDiamond, mockLifiQuote } from '$tests/mocks/lifi.mock';
import type { GasCost, LiFiStep } from '@lifi/sdk';
import { Transaction } from 'ethers/transaction';

describe('lifi-fee.utils', () => {
	const gasCost = ({ type, estimate }: Pick<GasCost, 'type' | 'estimate'>): GasCost => ({
		type,
		estimate,
		price: '1000000',
		limit: '0',
		amount: '0',
		amountUSD: '0',
		token: mockLifiQuote.action.fromToken
	});

	const withGasCosts = (gasCosts: GasCost[] | undefined): LiFiStep => ({
		...mockLifiQuote,
		estimate: { ...mockLifiQuote.estimate, gasCosts }
	});

	describe('lifiQuoteGas', () => {
		it("should be the swap transaction's estimate, as live quotes give it", () => {
			expect(lifiQuoteGas(withGasCosts([gasCost({ type: 'SEND', estimate: '299867' })]))).toBe(
				299_867n
			);
		});

		it('should leave out the approval, which is budgeted on its own', () => {
			expect(
				lifiQuoteGas(
					withGasCosts([
						gasCost({ type: 'APPROVE', estimate: '46000' }),
						gasCost({ type: 'SEND', estimate: '299867' })
					])
				)
			).toBe(299_867n);
		});

		it.each([
			{ case: 'no gas costs', gasCosts: undefined },
			{ case: 'an approval only', gasCosts: [gasCost({ type: 'APPROVE', estimate: '46000' })] },
			{
				case: 'an estimate that is not a number',
				gasCosts: [gasCost({ type: 'SEND', estimate: '' })]
			}
		])('should be undefined for $case', ({ gasCosts }) => {
			expect(lifiQuoteGas(withGasCosts(gasCosts))).toBeUndefined();
		});
	});

	describe('withLifiGasBuffer', () => {
		it('should add 20 %', () => {
			expect(withLifiGasBuffer(300_000n)).toBe(360_000n);
		});
	});

	describe('lifiUnsignedTxSize', () => {
		const transaction = {
			chainId: 8453n,
			to: mockLifiDiamond,
			data: `0x${'ab'.repeat(1_348)}`,
			value: 10_000_000_000_000_000n,
			gas: 947_792n,
			maxFeePerGas: 12_000_000n,
			maxPriorityFeePerGas: 1_000_000n
		};

		it('should be the size of the unsigned EIP-1559 transaction ethers serialises', () => {
			const { chainId, to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } = transaction;

			const serialized = Transaction.from({
				type: 2,
				chainId,
				nonce: 7,
				to,
				data,
				value,
				gasLimit: gas,
				maxFeePerGas,
				maxPriorityFeePerGas
			}).unsignedSerialized;

			expect(lifiUnsignedTxSize({ ...transaction, nonce: 7n })).toBe(
				BigInt((serialized.length - 2) / 2)
			);
		});

		// A nonce below 128 encodes in one byte; the largest, in nine.
		it('should bound every nonce by encoding the largest', () => {
			expect(lifiUnsignedTxSize(transaction)).toBe(
				lifiUnsignedTxSize({ ...transaction, nonce: 7n }) + 8n
			);
		});
	});

	describe('lifiApprovalCount', () => {
		it.each([
			{ case: 'covers the amount', allowance: 100n, count: 0 },
			{ case: 'exceeds the amount', allowance: 1_000n, count: 0 },
			{ case: 'is zero', allowance: ZERO, count: 1 },
			{ case: 'is smaller, and is reset first', allowance: 99n, count: 2 }
		])('should count $count when the allowance $case', ({ allowance, count }) => {
			expect(lifiApprovalCount({ allowance, amount: 100n })).toBe(count);
		});
	});

	describe('isLifiFeeAffordable', () => {
		it.each([
			{
				case: 'covers the amount and the fee',
				isNativeSource: true,
				nativeBalance: 110n,
				ok: true
			},
			{ case: 'covers the fee only', isNativeSource: true, nativeBalance: 109n, ok: false },
			{ case: 'covers the fee', isNativeSource: false, nativeBalance: 10n, ok: true },
			{ case: 'falls a wei short of the fee', isNativeSource: false, nativeBalance: 9n, ok: false }
		])(
			'should be $ok when the native balance $case (native source: $isNativeSource)',
			({ isNativeSource, nativeBalance, ok }) => {
				expect(isLifiFeeAffordable({ fee: 10n, amount: 100n, isNativeSource, nativeBalance })).toBe(
					ok
				);
			}
		);
	});
});
