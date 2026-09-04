import { GWEI_SIGNIFICANT_DIGITS } from '$eth/constants/eth.constants';
import { ZERO } from '$lib/constants/app.constants';
import type { Languages } from '$lib/enums/languages';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';
import { formatUnits } from 'ethers/utils';

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
 * A gas fee quoted in gwei rather than in the native token, for the priority options.
 *
 * A whole fee is a few millionths of an ETH, so in the token's own units the priority tiers
 * separate only in the eighth decimal and read as the same number. In gwei they are ordinary
 * integers, grouped because they run to six or seven digits. Only the options need this: the fee
 * row quotes one amount with nothing beside it to compare, so it stays in the token.
 *
 * The precision follows the magnitude, because a fixed number of decimals is wrong at both ends:
 * `44,185.0944` carries four digits nobody can act on, while a fee of `1.234` is nothing but its
 * decimals. Digits are spent on the leading figures and whatever is left goes to the fraction,
 * so the integer part is never rounded away. Below one gwei there is no integer part to protect,
 * so significant digits take over and a small fee cannot collapse to a flat `0`.
 */
export const formatGasFeeInGwei = ({
	value,
	language
}: {
	value: bigint;
	language: Languages;
}): string => {
	// `formatUnits` rather than `formatToken`: the latter is a display formatter and clips small
	// values before this rounding gets to see them, which would drop digits that still matter.
	const gwei = Number(formatUnits(value, 'gwei'));

	const options =
		gwei >= 1
			? {
					maximumFractionDigits: Math.max(
						0,
						GWEI_SIGNIFICANT_DIGITS - (Math.floor(Math.log10(gwei)) + 1)
					)
				}
			: { maximumSignificantDigits: GWEI_SIGNIFICANT_DIGITS - 1 };

	return new Intl.NumberFormat(language, options).format(gwei);
};
