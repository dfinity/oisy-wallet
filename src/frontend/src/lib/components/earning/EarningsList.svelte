<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { allVaults } from '$eth/derived/vaults.derived';
	import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
	import NoStakePlaceholder from '$lib/components/stake/NoStakePlaceholder.svelte';
	import VaultCard from '$lib/components/vaults/VaultCard.svelte';
	import { AppPath, VAULT_PARAM } from '$lib/constants/routes.constants';
	import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { showTokenFilteredBySelectedNetwork } from '$lib/utils/network.utils';
	import { getFilteredTokenGroup } from '$lib/utils/token-list.utils';
	import { filterEnabledToken } from '$lib/utils/token.utils';

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
</script>

<!-- TODO: add a skeleton -->
<div class="flex flex-col gap-3">
	{#if vaultsToDisplay.length === 0}
		<NoStakePlaceholder />
	{:else}
		{#each vaultsToDisplay as vault (vault.token.id)}
			<div class="overflow-hidden rounded-xl" transition:fade>
				<VaultCard
					data={vault}
					onClick={() =>
						goto(
							isTokenHarvestAutopilot(vault.token)
								? `${AppPath.EarnAutopilot}?${VAULT_PARAM}=${vault.token.address}`
								: transactionsUrl({ token: vault.token })
						)}
				/>
			</div>
		{/each}
	{/if}
</div>
