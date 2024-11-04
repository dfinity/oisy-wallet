import { type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const checkAnyNonZeroBalance = ($balancesStore: CertifiedStoreData<BalancesData>): boolean =>
	nonNullish($balancesStore) &&
	Object.getOwnPropertySymbols($balancesStore).some(
		(tokenId) => !($balancesStore[tokenId as TokenId]?.data?.isZero() ?? true)
	);
