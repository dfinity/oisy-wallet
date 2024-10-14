<script lang="ts">
	import type { DApp } from '$lib/types/dapp';

	export let dApp: DApp;
</script>

<div class="rounded-lg shadow-md bg-white p-6 hover:shadow-lg transition-shadow">
	<img
		src={dApp.imageUrl || '/default-dapp-icon.png'}
		alt={dApp.name}
		class="w-16 h-16 rounded-full mx-auto mb-4"
	/>
	<h2 class="text-center text-lg font-semibold">{dApp.name}</h2>
	<p class="text-center text-gray-600 mt-2">{dApp.description}</p>
	<div class="flex justify-center mt-4 space-x-2">
		{#each dApp.tags as tag}
			<span class="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">{tag}</span>
		{/each}
	</div>
</div>
