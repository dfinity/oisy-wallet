<script lang="ts">
	import DAppCard from './DAppCard.svelte';
	import SubmitDAppCard from './SubmitDAppCard.svelte';

	export let dapps: Array<{
		name: string,
		description: string,
		tags: string[],
		imageUrl?: string
	}> = [];

	export let selectedFilter: string = "All dApps";

	// Filtered dApps based on the selected filter
	$: filteredDapps = dapps.filter(dapp => {
		if (selectedFilter === "All dApps") return true;
		if (selectedFilter === "Signer Standard Supported") return dapp.tags.includes("Signer");
		if (selectedFilter === "Staking") return dapp.tags.includes("Staking");
		if (selectedFilter === "Other") return !["Signer", "Staking"].some(tag => dapp.tags.includes(tag));
		return true;
	});
</script>

<!-- Grid Layout for dApp Cards -->
<div class="container mx-auto py-8">
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each filteredDapps as dapp (dapp.name)}
			<DAppCard
				name={dapp.name}
				description={dapp.description}
				tags={dapp.tags}
				imageUrl={dapp.imageUrl}
			/>
		{/each}

		<!-- Submit Your dApp Card -->
		<SubmitDAppCard />
	</div>
</div>
