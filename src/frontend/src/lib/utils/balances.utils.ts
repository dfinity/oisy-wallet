import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { Balance, LegacyBalance } from '$lib/types/balance';
import type { TokenId } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const checkAnyNonZeroBalance = ($balancesStore: CertifiedStoreData<BalancesData>): boolean =>
	nonNullish($balancesStore) &&
	Object.getOwnPropertySymbols($balancesStore).some(
		(tokenId) =>
			!(
				isNullish($balancesStore[tokenId as TokenId]?.data) ||
				$balancesStore[tokenId as TokenId]?.data?.total === ZERO
			)
	);

/**
 * Check if all balances are zero.
 *
 * It requires a minimum length of the balance data to be considered valid.
 * This is to avoid false positives when, for example, the list of tokens is still loading,
 * and the number of tokens in the balance store is not the same as the number of tokens in the UI.
 *
 * @param $balancesStore - Certified store of balances.
 * @param minLength - Minimum length of the store to be considered valid.
 * @returns `true` if all balances are zero and the conditions are met, `false` otherwise.
 */
export const checkAllBalancesZero = ({
	$balancesStore,
	minLength
}: {
	$balancesStore: CertifiedStoreData<BalancesData>;
	minLength: number;
}): boolean =>
	nonNullish($balancesStore) &&
	Object.getOwnPropertySymbols($balancesStore).length >= Math.max(minLength, 1) &&
	Object.getOwnPropertySymbols($balancesStore).every((tokenId) => {
		const balance: Option<BalancesData> = $balancesStore[tokenId as TokenId];

		return balance === null || balance?.data?.total === ZERO || balance?.data === null;
	});

/**
 * Extracts the total balance from a Balance object for backward compatibility
 * @param balance - The structured balance object
 * @returns The total balance as a bigint
 */
export const getBalanceTotal = (balance: Balance): bigint => balance.total;

/**
 * Converts a legacy balance to the new structured format
 * @param legacyBalance - The legacy balance (bigint)
 * @returns The structured balance object
 */
export const convertLegacyBalance = (legacyBalance: LegacyBalance): Balance => ({
	total: legacyBalance
});

/**
 * Checks if a balance is a legacy balance (bigint) or new structured balance
 * @param balance - The balance to check
 * @returns True if it's a legacy balance, false if it's a structured balance
 */
export const isLegacyBalance = (balance: Balance | LegacyBalance): balance is LegacyBalance =>
	typeof balance === 'bigint';

/**
 * Normalizes a balance to the new structured format
 * @param balance - Either a legacy balance or structured balance
 * @returns The structured balance object
 */
export const normalizeBalance = (balance: Balance | LegacyBalance): Balance => {
	if (isLegacyBalance(balance)) {
		return convertLegacyBalance(balance);
	}
	return balance;
};
