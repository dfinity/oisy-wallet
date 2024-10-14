<script lang="ts">
	export let categories: string[] = [];
	export let selectedFilter: string = "All";
	export let onFilterChange: (filter: string) => void;

	const handleFilterChange = (filter: string) => {
		selectedFilter = filter;
		onFilterChange(filter);
	};
</script>

<div class="flex justify-center space-x-4 my-6">
	<button
		class="px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300"
		class:bg-blue-600={selectedFilter === "All"}
		class:text-white={selectedFilter === "All"}
		class:bg-gray-200={selectedFilter !== "All"}
		class:text-gray-700={selectedFilter !== "All"}
		on:click={() => handleFilterChange("All")}
	>
		All
	</button>

	{#each categories as category}
		<button
			class="px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300"
			class:bg-blue-600={selectedFilter === category}
			class:text-white={selectedFilter === category}
			class:bg-gray-200={selectedFilter !== category}
			class:text-gray-700={selectedFilter !== category}
			on:click={() => handleFilterChange(category)}
		>
			{category}
		</button>
	{/each}
</div>
