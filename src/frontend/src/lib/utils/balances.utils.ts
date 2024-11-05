import { type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

export const checkAnyNonZeroBalance = ($balancesStore: CertifiedStoreData<BalancesData>): boolean =>
	nonNullish($balancesStore) &&
	Object.getOwnPropertySymbols($balancesStore).some(
		(tokenId) => !($balancesStore[tokenId as TokenId]?.data?.isZero() ?? true)
	);

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

		return balance === null || (balance?.data?.isZero() ?? false) || balance?.data === null;
	});
