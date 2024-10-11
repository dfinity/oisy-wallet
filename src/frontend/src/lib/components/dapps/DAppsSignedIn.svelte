<script lang="ts">
	import DAppCardGrid from '$lib/components/dapps/DAppCardGrid.svelte';
	import FilterButtons from '$lib/components/dapps/FilterButtons.svelte';
	import dapps from '$lib/../data/dapps.json';

	let selectedFilter = "All dApps";
	const filters = ["All dApps", "Signer Standard Supported", "Staking", "Other"];

</script>

<h1 class="text-center text-3xl font-bold my-8">Discover dApps</h1>

<FilterButtons {selectedFilter} {filters} />

<DAppCardGrid {dapps} {selectedFilter} />
