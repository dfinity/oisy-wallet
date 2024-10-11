<script lang="ts">
	export let name: string;
	export let description: string;
	export let tags: string[];
	export let imageUrl: string = '/default-dapp-icon.png'; // Default image if no URL is provided
</script>

<div class="rounded-lg shadow-md bg-white p-6 hover:shadow-lg transition-shadow">
	<img
		src={imageUrl}
		alt={name}
		class="w-16 h-16 rounded-full mx-auto mb-4"
	/>
	<h2 class="text-center text-lg font-semibold">{name}</h2>
	<p class="text-center text-gray-600 mt-2">{description}</p>
	<div class="flex justify-center mt-4 space-x-2">
		{#each tags as tag}
			<span class="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">{tag}</span>
		{/each}
	</div>
</div>
