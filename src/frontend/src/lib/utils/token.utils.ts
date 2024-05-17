import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import type { TokenId } from '$lib/types/token';

/**
 * Calculates the maximum amount for a transaction.
 *
 * @param {Object} params
 * @param {bigint | undefined} params.balance The balance of the account.
 * @param {bigint | undefined} params.fee The fee of the transaction.
 * @param {number} params.tokenDecimals The decimals of the token.
 * @param {TokenId} params.tokenId The token of the transaction.
 * @returns {number} The maximum amount for the transaction.
 */
export const getMaxTransactionAmount = ({
	balance = 0n,
	fee = 0n,
	tokenDecimals,
	tokenId
}: {
	balance?: bigint;
	fee?: bigint;
	tokenDecimals: number;
	tokenId: TokenId;
}): number => {
	if (isSupportedEthTokenId(tokenId)) {
		return Math.max(Number(balance - fee), 0) / 10 ** tokenDecimals;
	}
	return Math.max(Number(balance), 0) / 10 ** tokenDecimals;
};
