import { ZERO } from '$lib/constants/app.constants';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';

/**
 * The most the transaction can cost its sender, and therefore what the balance has to cover.
 *
 * On an OP-stack chain the balance must also cover the L1 data fee, which is charged on top of L2
 * gas and is not a price per gas. Leaving it out is not a rounding error: it makes a transaction
 * that spends the whole balance short by exactly that fee, so the chain can never include it.
 */
export const maxGasFee = ({ maxFeePerGas, gas, l1Fee }: TransactionFeeData): bigint | undefined =>
	isNullish(maxFeePerGas) ? undefined : maxFeePerGas * gas + (l1Fee ?? ZERO);

export const minGasFee = ({ maxPriorityFeePerGas, gas }: TransactionFeeData): bigint =>
	(maxPriorityFeePerGas ?? ZERO) * gas;

/**
 * What the transaction is expected to actually cost, as opposed to what it authorises.
 *
 * EIP-1559 charges `(baseFee + min(tip, maxFeePerGas - baseFee)) * gasUsed` and refunds the rest,
 * so `maxGasFee` (`maxFeePerGas * gas`) is an upper bound the sender must be able to cover, not a
 * price. It runs well above the real cost, because `maxFeePerGas` carries headroom for a base fee
 * rise and because `gas` is a limit that ERC-20 transfers deliberately pad. The L1 data fee is the
 * exception: nothing about it is refunded, so it counts in full towards the expected cost too.
 *
 * Falls back to `maxGasFee` when the base fee is unknown: overstating the cost is safe, showing
 * nothing is not.
 */
export const estimatedGasFee = ({
	baseFeePerGas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas,
	l1Fee
}: TransactionFeeData): bigint | undefined => {
	if (isNullish(maxFeePerGas)) {
		return undefined;
	}

	if (isNullish(baseFeePerGas)) {
		return maxGasFee({ maxFeePerGas, maxPriorityFeePerGas, gas, l1Fee });
	}

	const effectiveFeePerGas = baseFeePerGas + (maxPriorityFeePerGas ?? ZERO);

	// The sender never pays more than they authorised, even if the base fee has risen since it was
	// sampled.
	return (
		(effectiveFeePerGas > maxFeePerGas ? maxFeePerGas : effectiveFeePerGas) * gas + (l1Fee ?? ZERO)
	);
};
