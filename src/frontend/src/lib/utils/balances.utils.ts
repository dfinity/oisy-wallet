import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

export const checkAnyNonZeroBalance = ($balancesStore: CertifiedStoreData<BalancesData>): boolean =>
	nonNullish($balancesStore) &&
	Object.getOwnPropertySymbols($balancesStore).some((tokenId) => {
		const balance = $balancesStore[tokenId as TokenId]?.data;

		return nonNullish(balance) && balance !== ZERO;
	});

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

		return balance === null || balance?.data === ZERO || balance?.data === null;
	});
