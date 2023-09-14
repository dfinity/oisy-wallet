import { balancesStore } from '$lib/stores/balances.store';
import { fiatStore } from '$lib/stores/fiat.store';
import { formatTokenShort } from '$lib/utils/format.utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

export const totalFiatBalance: Readable<number | undefined | null> = derived(
	[balancesStore, fiatStore],
	([$balancesStore, $fiatStore]) => {
		return Object.getOwnPropertySymbols($balancesStore || {}).reduce((next, token) => {
			const tokenBalance = formatTokenShort({
				value: $balancesStore?.[token] || BigNumber.from('0')
			});
			const fiatValue = $fiatStore?.[token] || 0;
			return next + +tokenBalance * fiatValue;
		}, 0);
	}
);
