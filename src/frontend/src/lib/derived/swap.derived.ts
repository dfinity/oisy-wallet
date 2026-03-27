import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	allCrossChainSwapTokens,
	allKongSwapCompatibleIcrcTokens
} from '$lib/derived/all-tokens.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export interface SwappableTokens {
	sourceToken: Token | undefined;
	destinationToken: Token | undefined;
}

const selectedSwappableToken: Readable<Token | undefined> = derived(
	[pageToken, allKongSwapCompatibleIcrcTokens, allCrossChainSwapTokens],
	([$pageToken, $allKongSwapCompatibleIcrcTokens, $allCrossChainSwapTokens]) => {
		if (nonNullish($pageToken)) {
			const selectedToken = $pageToken;

			const swappableToken: Token | undefined = [
				{ ...ICP_TOKEN, enabled: true },
				...$allKongSwapCompatibleIcrcTokens,
				...$allCrossChainSwapTokens
			].find((t) => t.id === selectedToken.id);

			if (nonNullish(swappableToken)) {
				return {
					...selectedToken,
					...swappableToken
				};
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

		const balance: Balance | undefined = $balancesStore?.[selectedToken.id]?.data;
		if (isNullish(balance)) {
			return { sourceToken: undefined, destinationToken: undefined };
		}

		if (balance > ZERO) {
			return { sourceToken: selectedToken, destinationToken: undefined };
		}
		return { sourceToken: undefined, destinationToken: selectedToken };
	}
);
