import { isGLDTToken } from '$icp-eth/utils/token.utils';
import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { ZERO } from '$lib/constants/app.constants';
import { enabledFungibleTokensUi } from '$lib/derived/tokens.derived';
import type { StakeBalances } from '$lib/types/stake-balance';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const stakeBalances: Readable<StakeBalances> = derived(
	[enabledFungibleTokensUi, gldtStakeStore],
	([$enabledFungibleTokensUi, $gldtStakeStore]) => {
		const balances = {} as StakeBalances;

		const gldtToken = $enabledFungibleTokensUi.find(isGLDTToken);

		if (nonNullish(gldtToken)) {
			const claimable = $gldtStakeStore?.position?.claimable_rewards?.find(([tokenSymbol]) =>
				Object.keys(tokenSymbol).includes(gldtToken.symbol)
			)?.[1];

			balances[gldtToken.id] = {
				staked: $gldtStakeStore?.position?.staked ?? ZERO,
				claimable: claimable ?? ZERO
			};
		}

		return balances;
	}
);
