import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Balance } from '$lib/types/balance';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export interface SwappableTokens {
	sourceToken: IcTokenToggleable | undefined;
	destinationToken: IcTokenToggleable | undefined;
}

const selectedSwappableToken: Readable<IcTokenToggleable | undefined> = derived(
	[pageToken, allKongSwapCompatibleIcrcTokens],
	([$pageToken, $allKongSwapCompatibleIcrcTokens]) => {
		if (nonNullish($pageToken) && isIcToken($pageToken)) {
			const selectedToken = $pageToken;

			const swappableToken: IcTokenToggleable | undefined = [
				{ ...ICP_TOKEN, enabled: true },
				...$allKongSwapCompatibleIcrcTokens
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
