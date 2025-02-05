import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

export interface SwappableTokens {
	sourceToken: IcToken | undefined;
	destinationToken: IcToken | undefined;
}

const selectedSwappableToken: Readable<IcToken | undefined> = derived(
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

export const swappableTokens: Readable<SwappableTokens> = derived(
	[balancesStore, selectedSwappableToken],
	([$balancesStore, $selectedSwappableToken]) => {
		const selectedToken = $selectedSwappableToken;
		if (isNullish(selectedToken)) {
			return { sourceToken: undefined, destinationToken: undefined };
		}

		const balance: BigNumber | undefined = $balancesStore?.[selectedToken.id]?.data;
		if (isNullish(balance)) {
			return { sourceToken: undefined, destinationToken: undefined };
		}

		if (balance.gt(BigNumber.from(0))) {
			return { sourceToken: selectedToken, destinationToken: undefined };
		}
		return { sourceToken: undefined, destinationToken: selectedToken };
	}
);
