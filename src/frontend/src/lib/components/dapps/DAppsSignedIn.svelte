<script lang="ts">
	import DAppCardGrid from '$lib/components/dapps/DAppCardGrid.svelte';
	import FilterButtons from '$lib/components/dapps/DAppsFilterButtons.svelte';
	import dApps from '$lib/../data/dapps.json';
	import { i18n } from '$lib/stores/i18n.store';

	let selectedFilter = "All";

	const categories = Array.from(
		new Set(dApps.flatMap(dApp => dApp.categories))
	);

	const handleFilterChange = (filter: string) => {
		selectedFilter = filter;
	};

</script>

<h1 class="text-center text-3xl font-bold my-8">{$i18n.dapps.text.headline}</h1>

<FilterButtons {selectedFilter} {categories} onFilterChange={handleFilterChange} />

<DAppCardGrid {dApps} {selectedFilter} />
