<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { allVaults } from '$eth/derived/vaults.derived';
	import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
	import NoStakePlaceholder from '$lib/components/stake/NoStakePlaceholder.svelte';
	import VaultCard from '$lib/components/vaults/VaultCard.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { filterEnabledToken } from '$lib/utils/token.utils';

	let vaultsToDisplay = $derived(
		$allVaults.filter(
			({ token }) =>
				(token.usdBalance ?? 0) > 0 && (isTokenHarvestAutopilot(token) || filterEnabledToken(token))
		)
	);
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
								? `${AppPath.EarnAutopilot}?vault=${vault.token.address}`
								: transactionsUrl({ token: vault.token })
						)}
				/>
			</div>
		{/each}
	{/if}
</div>
