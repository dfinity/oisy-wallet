import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import type { Token, TokenStandard } from '$lib/types/token';

/**
 * Calculates the maximum amount for a transaction.
 *
 * @param {Object} params
 * @param {bigint | undefined} params.balance The balance of the account.
 * @param {bigint | undefined} params.fee The fee of the transaction.
 * @param {number} params.tokenDecimals The decimals of the token.
 * @param {string} params.tokenStandard The standard of the token.
 * @returns {number} The maximum amount for the transaction.
 */
export const getMaxTransactionAmount = ({
	balance = 0n,
	fee = 0n,
	tokenDecimals,
	tokenStandard
}: {
	balance?: bigint;
	fee?: bigint;
	tokenDecimals: number;
	tokenStandard: TokenStandard;
}): number => {
	return (
		Math.max(Number(balance - (tokenStandard !== 'erc20' ? fee : 0n)), 0) / 10 ** tokenDecimals
	);
};

export const isTokenTestnet = (token: Token): boolean =>
	isTokenIcrcTestnet(token) || token.network.env === 'testnet';
