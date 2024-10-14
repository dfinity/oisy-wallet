<script lang="ts">
	import DAppCardGrid from '$lib/components/dapps/DAppCardGrid.svelte';
	import FilterButtons from '$lib/components/dapps/DAppsFilterButtons.svelte';
	import dApps from '$lib/../data/dapps.json';
	import { i18n } from '$lib/stores/i18n.store';
	import { ALL_DAPPS_CATEGORY } from '$lib/types/dapp';

	let selectedFilter = ALL_DAPPS_CATEGORY;

	const categories = Array.from(new Set(dApps.flatMap((dApp) => dApp.categories)));

	const handleFilterChange = (filter: string) => {
		selectedFilter = filter;
	};

	$: filteredDapps =
		selectedFilter !== ALL_DAPPS_CATEGORY
			? dApps.filter((dApp) => dApp.categories.includes(selectedFilter))
			: dApps;
</script>

<h6 class="m-0 text-center text-misty-rose">{$i18n.dapps.text.sub_headline}</h6>
<h1 class="mb-5 mt-2 text-center text-3xl font-bold">{$i18n.dapps.text.headline}</h1>

<FilterButtons class="mx-auto" {selectedFilter} {categories} onFilterChange={handleFilterChange} />

<h4 class="mt-14">
	{selectedFilter}
</h4>
<div class="mt-5">
	<DAppCardGrid dApps={filteredDapps} />
</div>
