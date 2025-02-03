import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived } from 'svelte/store';

const selectedSwappableToken = derived(
	[pageToken, allKongSwapCompatibleIcrcTokens],
	([$pageToken, $allKongSwapCompatibleIcrcTokens]) => {
		if (nonNullish($pageToken) && isIcToken($pageToken)) {
			const selectedToken = $pageToken;

			const isSwapAvailable: boolean = [ICP_TOKEN, ...$allKongSwapCompatibleIcrcTokens].some(
				(t) => t.id === selectedToken.id
			);

			if (isSwapAvailable) {
				return selectedToken;
			}
		}

		return undefined;
	}
);

export const sourceToken = derived(
	[balancesStore, selectedSwappableToken],
	([$balancesStore, $selectedSwappableToken]) => {
		const selectedToken = $selectedSwappableToken;
		if (isNullish(selectedToken)) {
			return undefined;
		}

		const balance: BigNumber | undefined = $balancesStore?.[selectedToken.id]?.data;

		if (nonNullish(balance) && balance.gt(BigNumber.from(0))) {
			return selectedToken;
		}

		return undefined;
	}
);

export const destinationToken = derived(
	[balancesStore, selectedSwappableToken],
	([$balancesStore, $selectedSwappableToken]) => {
		const selectedToken = $selectedSwappableToken;
		if (isNullish(selectedToken)) {
			return undefined;
		}

		const balance: BigNumber | undefined = $balancesStore?.[selectedToken.id]?.data;

		if (nonNullish(balance) && balance.lte(BigNumber.from(0))) {
			return selectedToken;
		}

		return undefined;
	}
);
