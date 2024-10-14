<script lang="ts">
	import type { DApp } from '$lib/types/dapp';

	export let dApp: DApp;
</script>

<div class="relative rounded-3xl bg-white p-4 pt-14 hover:shadow hover:cursor-pointer transition-shadow">
	{#if dApp.imageUrl} <img
		src={dApp.imageUrl || '/default-dapp-icon.png'}
		alt={dApp.name}
		class="absolute -top-9 left-4 w-20 h-20 rounded-full"
	/>
	{/if}
	<div class="flex flex-col justify-between gap-y-2 h-full">
		<div>
			<h2 class="text-start text-lg font-semibold">{dApp.name}</h2>
			<p class="text-start text-misty-rose m-0">{dApp.description}</p>
		</div>
		<div class="flex space-x-2">
			{#each dApp.tags as tag}
				<span class="bg-zumthor text-primary text-xs px-3 py-1.5 rounded-full">{tag}</span>
			{/each}
		</div>
	</div>
</div>
