<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { anyLendBorrowProviderEnabled } from '$env/lend-borrow';
	import { erc4626CustomTokensNotInitialized } from '$eth/derived/erc4626.derived';
	import { allVaults } from '$eth/derived/vaults.derived';
	import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
	import EarningsListSkeletons from '$lib/components/earning/EarningsListSkeletons.svelte';
	import LiquidiumPositionCard from '$lib/components/liquidium/LiquidiumPositionCard.svelte';
	import NoStakePlaceholder from '$lib/components/stake/NoStakePlaceholder.svelte';
	import VaultCard from '$lib/components/vaults/VaultCard.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AppPath, VAULT_PARAM } from '$lib/constants/routes.constants';
	import { liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { showTokenFilteredBySelectedNetwork } from '$lib/utils/network.utils';
	import { getFilteredTokenGroup } from '$lib/utils/token-list.utils';
	import { filterEnabledToken } from '$lib/utils/token.utils';

	let loading = $derived($erc4626CustomTokensNotInitialized);

	let filteredVaults = $derived(
		$allVaults.filter(
			({ token }) =>
				(token.usdBalance ?? 0) > 0 &&
				(isTokenHarvestAutopilot(token) || filterEnabledToken(token)) &&
				showTokenFilteredBySelectedNetwork({
					token,
					$selectedNetwork,
					$pseudoNetworkChainFusion
				})
		)
	);

	let filter = $derived($tokenListStore.filter);

	let vaultsToDisplay = $derived.by(() => {
		if (filter === '') {
			return filteredVaults;
		}

		const matchingTokens = getFilteredTokenGroup({
			filter,
			list: filteredVaults.map(({ token }) => token)
		});

		const matchingTokenIds = new Set(matchingTokens.map(({ id }) => id));

		return filteredVaults.filter(({ token }) => matchingTokenIds.has(token.id));
	});

	// Liquidium supply positions sit alongside the vault stakes (grouped by type, each card
	// carrying its own provider tag). Gated by the lend & borrow feature flag.
	let supplyReserves = $derived(
		anyLendBorrowProviderEnabled
			? ($liquidiumPortfolio?.reserves ?? []).filter(({ deposited }) => deposited > ZERO)
			: []
	);

	let supplyReservesToDisplay = $derived(
		filter === ''
			? supplyReserves
			: supplyReserves.filter(({ asset }) => asset.toLowerCase().includes(filter.toLowerCase()))
	);

	// One combined list sorted by USD value (highest first), so Autopilot stakes and Liquidium
	// supplies interleave by size rather than sitting in separate groups.
	let positionsToDisplay = $derived(
		[
			...vaultsToDisplay.map((vault) => ({
				kind: 'vault' as const,
				id: vault.token.id,
				usdValue: vault.token.usdBalance ?? 0,
				vault
			})),
			...supplyReservesToDisplay.map((reserve) => ({
				kind: 'liquidium' as const,
				id: reserve.poolId,
				usdValue: reserve.suppliedUsd,
				reserve
			}))
		].sort((a, b) => b.usdValue - a.usdValue)
	);
</script>

<EarningsListSkeletons {loading}>
	<div class="flex flex-col gap-3">
		{#if positionsToDisplay.length === 0}
			<NoStakePlaceholder />
		{:else}
			{#each positionsToDisplay as position (position.id)}
				<div class="overflow-hidden rounded-xl" transition:fade>
					{#if position.kind === 'vault'}
						<VaultCard
							data={position.vault}
							onClick={() =>
								goto(
									isTokenHarvestAutopilot(position.vault.token)
										? `${AppPath.EarnAutopilot}?${VAULT_PARAM}=${position.vault.token.address}`
										: transactionsUrl({ token: position.vault.token })
								)}
						/>
					{:else}
						<LiquidiumPositionCard reserve={position.reserve} variant="holdings" />
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</EarningsListSkeletons>
