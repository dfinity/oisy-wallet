import { HARVEST_AUTOPILOT_TOKENS } from '$eth/constants/harvest-autopilots.constants';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
import { exchanges } from '$lib/derived/exchange.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import type { Vault } from '$lib/types/vaults';
import { mapTokenUi } from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const harvestAutopilotTokens: Readable<Erc4626CustomToken[]> = derived(
	[erc4626Tokens],
	([$erc4626Tokens]) => $erc4626Tokens.filter((token) => isTokenHarvestAutopilot(token))
);

export const disabledHarvestAutopilotTokens: Readable<Erc4626CustomToken[]> = derived(
	[harvestAutopilotTokens],
	([$harvestAutopilotTokens]) => $harvestAutopilotTokens.filter(({ enabled }) => !enabled)
);

export const harvestAutopilots: Readable<Vault[]> = derived(
	[harvestAutopilotTokens, balancesStore, stakeBalances, exchanges, harvestVaultsStore],
	([$harvestAutopilotTokens, $balances, $stakeBalances, $exchanges, $harvestVaultsStore]) =>
		$harvestAutopilotTokens.map((token) => {
			const tokenUi = mapTokenUi({
				token,
				$balances,
				$stakeBalances,
				$exchanges
			});

			return {
				token: tokenUi,
				apy: $harvestVaultsStore[tokenUi.address.toLowerCase()]?.estimatedApy,
				totalValueLocked: $harvestVaultsStore[tokenUi.address.toLowerCase()]?.totalValueLocked
			};
		})
);

export const harvestAutopilotsCurrentEarning: Readable<number> = derived(
	[harvestAutopilots],
	([$harvestAutopilots]) =>
		$harvestAutopilots.reduce<number>(
			(acc, { apy, token: { usdBalance } }) =>
				nonNullish(apy) && nonNullish(usdBalance) ? acc + usdBalance * (Number(apy) / 100) : acc,
			0
		)
);

// Deliberately sourced from the shipped vault list rather than from harvestAutopilots: the rate
// Harvest offers does not depend on which networks the user enabled, and its only consumer is the
// Earn card, which must keep advertising it when they are off.
export const harvestAutopilotsMaxApy: Readable<string> = derived(
	[harvestVaultsStore],
	([$harvestVaultsStore]) =>
		HARVEST_AUTOPILOT_TOKENS.reduce<string>((acc, { address }) => {
			const apy = $harvestVaultsStore[address.toLowerCase()]?.estimatedApy;

			return nonNullish(apy) ? `${Math.max(Number(acc), Number(apy))}` : acc;
		}, '0')
);

export const harvestAutopilotsUsdBalance: Readable<number> = derived(
	[harvestAutopilots],
	([$harvestAutopilots]) =>
		$harvestAutopilots.reduce<number>(
			(acc, { token: { usdBalance } }) => (nonNullish(usdBalance) ? acc + usdBalance : acc),
			0
		)
);

export const enabledHarvestAutopilotsUsdBalance: Readable<number> = derived(
	[harvestAutopilots],
	([$harvestAutopilots]) =>
		$harvestAutopilots.reduce<number>(
			(acc, { token: { usdBalance, enabled } }) =>
				nonNullish(usdBalance) && enabled ? acc + usdBalance : acc,
			0
		)
);
