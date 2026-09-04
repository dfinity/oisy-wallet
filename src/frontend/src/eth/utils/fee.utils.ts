import { GWEI_DISPLAY_DECIMALS } from '$eth/constants/eth.constants';
import { ZERO } from '$lib/constants/app.constants';
import type { Languages } from '$lib/enums/languages';
import type { TransactionFeeData } from '$lib/types/transaction';
import { formatToken } from '$lib/utils/format.utils';
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

/**
 * A gas fee quoted in gwei rather than in the native token.
 *
 * A whole fee is a few millionths of an ETH, so in the token's own units the priority tiers
 * separate only in the eighth decimal and read as the same number. In gwei they are ordinary
 * integers, grouped because they run to six or seven digits.
 *
 * The fraction is kept rather than rounded away: a realistic fee is thousands of gwei and needs
 * none, but a cheap chain or a small gas limit can produce a fraction, and rounding that to a
 * flat `0` would quote a free transaction.
 */
export const formatGasFeeInGwei = ({
	value,
	language
}: {
	value: bigint;
	language: Languages;
}): string =>
	new Intl.NumberFormat(language, { maximumFractionDigits: GWEI_DISPLAY_DECIMALS }).format(
		Number(formatToken({ value, unitName: 'gwei' }))
	);
