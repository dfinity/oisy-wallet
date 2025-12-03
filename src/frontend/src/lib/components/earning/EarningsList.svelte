<script lang="ts">
	import { fade } from 'svelte/transition';
	import EarningCard from '$lib/components/earning/EarningCard.svelte';
	import NoStakePlaceholder from '$lib/components/stake/NoStakePlaceholder.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import type { ProviderUi } from '$lib/types/provider-ui';
	import { StakeProvider } from '$lib/types/stake';

	// TODO: this logic is very custom-made for the current single provider. Improve it to be more generic: each provider has a feature (for example earning), and each feature a sub-group (for example staking), and each sub-group has a list of objects to which it applies (like tokens).
	let earningProvidersUi = $derived(
		Object.entries(stakeProvidersConfig).reduce<ProviderUi[]>((acc, [providerName, config]) => {
			if (providerName === StakeProvider.GLDT) {
				const providerUi = {
					...config,
					// TODO: add specific values to be shown, for example total position in USD, max APY
					totalPositionUsd: 1
				};

				acc.push(providerUi);
			}

			return acc;
		}, [])
	);

	let filteredEarningProviders = $derived(
		earningProvidersUi.filter(({ totalPositionUsd }) => totalPositionUsd !== 0)
	);
</script>

<!-- TODO: add a skeleton -->
<div class="flex flex-col gap-3">
	{#each filteredEarningProviders as provider (provider.name)}
		<div class="overflow-hidden rounded-xl" transition:fade>
			<EarningCard {provider} />
		</div>
	{/each}

	{#if filteredEarningProviders?.length === 0}
		<NoStakePlaceholder />
	{/if}
</div>
