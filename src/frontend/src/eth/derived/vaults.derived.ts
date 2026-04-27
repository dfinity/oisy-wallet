import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import type { Vault } from '$lib/types/vaults';
import { mapTokenUi } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

export const allVaults: Readable<Vault[]> = derived(
	[erc4626Tokens, balancesStore, stakeBalances, exchanges, harvestVaultsStore],
	([$erc4626Tokens, $balances, $stakeBalances, $exchanges, $harvestVaultsStore]) =>
		$erc4626Tokens.map((token) => {
			const tokenUi = mapTokenUi({
				token,
				$balances,
				$stakeBalances,
				$exchanges
			});

			return {
				token: tokenUi,
				// TODO: find a way to get APY for non-harvest autopilot vaults
				apy: $harvestVaultsStore[tokenUi.address.toLowerCase()]?.estimatedApy
			};
		})
);
