import { E8S_PER_ICP } from '$lib/constants/icp.constants';
import { type Token } from '@dfinity/utils';

/**
 * Truncates the given amount to 8 decimals.
 *
 * This is used to then convert the amount to a string or to a number afterwards.
 */
const ulpsToE8s = ({ ulps, decimals }: { ulps: bigint; decimals: number }): bigint => {
	if (decimals === 8) {
		return ulps;
	} else if (decimals < 8) {
		return ulps * 10n ** BigInt(8 - decimals);
	}
	return ulps / 10n ** BigInt(decimals - 8);
};

/**
 * Calculates the maximum amount for a transaction.
 *
 * @param {Object} params
 * @param {bigint | undefined} params.balance The balance of the account in E8S.
 * @param {bigint | undefined} params.fee The fee of the transaction in E8S.
 * @param {bigint | undefined}params.maxAmount The maximum amount of the transaction not counting the fees.
 * @returns {number} The maximum amount for the transaction.
 */
export const getMaxTransactionAmount = ({
	balance = 0n,
	fee = 0n,
	maxAmount,
	token
}: {
	balance?: bigint;
	fee?: bigint;
	maxAmount?: bigint;
	token: Token;
}): number => {
	const maxUserAmount = ulpsToE8s({
		ulps: balance - fee,
		decimals: token.decimals
	});
	if (maxAmount === undefined) {
		return Math.max(Number(maxUserAmount), 0) / E8S_PER_ICP;
	}
	const maxAmountE8s = ulpsToE8s({ ulps: maxAmount, decimals: token.decimals });
	return Math.min(Number(maxAmountE8s), Math.max(Number(maxUserAmount), 0)) / E8S_PER_ICP;
};
