
<script lang="ts">
	import FilterButton from '$lib/components/dapps/FilterButton.svelte';
	import { ALL_DAPPS_CATEGORY } from '$lib/types/dapp';
	export let categories: string[] = [];
	export let selectedFilter: string;
	export let onFilterChange: (filter: string) => void;


	const handleFilterChange = (filter: string) => {
		selectedFilter = filter;
		onFilterChange(filter);
	};
</script>

<div class="flex p-1 bg-white rounded-full gap-2 w-fit {$$restProps.class}">
	<FilterButton label={ALL_DAPPS_CATEGORY} isActive={selectedFilter === ALL_DAPPS_CATEGORY} on:click={() => handleFilterChange(ALL_DAPPS_CATEGORY)} />

	{#each categories as category}
		<FilterButton label={category} on:click={() => handleFilterChange(category)}
									isActive={selectedFilter === category} />
	{/each}
</div>
