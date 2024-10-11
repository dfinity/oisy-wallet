<script lang="ts">
	export let selectedFilter: string = "all";  // The currently selected filter
	export let filters: Array<string> = ["All dApps", "Signer Standard Supported", "Staking", "Other"];

	// Function to change the filter
	const selectFilter = (filter: string) => {
		selectedFilter = filter;
	};
</script>

<!-- Filter buttons container -->
<div class="flex justify-center space-x-4 my-6">
	{#each filters as filter}
		<button
			class="px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300"
			class:bg-blue-600={selectedFilter === filter}
			class:text-white={selectedFilter === filter}
			class:bg-gray-200={selectedFilter !== filter}
			class:text-gray-700={selectedFilter !== filter}
			on:click={() => selectFilter(filter)}
		>
			{filter}
		</button>
	{/each}
</div>
