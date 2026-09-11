import { ZERO } from '$lib/constants/app.constants';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';

export const maxGasFee = ({ maxFeePerGas, gas }: TransactionFeeData): bigint | undefined =>
	isNullish(maxFeePerGas) ? undefined : maxFeePerGas * gas;

export const minGasFee = ({ maxPriorityFeePerGas, gas }: TransactionFeeData): bigint =>
	(maxPriorityFeePerGas ?? ZERO) * gas;

/**
 * What the transaction is expected to actually cost, as opposed to what it authorises.
 *
 * EIP-1559 charges `(baseFee + min(tip, maxFeePerGas - baseFee)) * gasUsed` and refunds the rest,
 * so `maxGasFee` (`maxFeePerGas * gas`) is an upper bound the sender must be able to cover, not a
 * price. It runs well above the real cost, because `maxFeePerGas` carries headroom for a base fee
 * rise and because `gas` is a limit that ERC-20 transfers deliberately pad.
 *
 * Falls back to `maxGasFee` when the base fee is unknown: overstating the cost is safe, showing
 * nothing is not.
 */
export const estimatedGasFee = ({
	baseFeePerGas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	gas
}: TransactionFeeData): bigint | undefined => {
	if (isNullish(maxFeePerGas)) {
		return undefined;
	}

	if (isNullish(baseFeePerGas)) {
		return maxGasFee({ maxFeePerGas, maxPriorityFeePerGas, gas });
	}

	const effectiveFeePerGas = baseFeePerGas + (maxPriorityFeePerGas ?? ZERO);

	// The sender never pays more than they authorised, even if the base fee has risen since it was
	// sampled.
	return (effectiveFeePerGas > maxFeePerGas ? maxFeePerGas : effectiveFeePerGas) * gas;
};
