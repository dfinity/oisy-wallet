<script lang="ts">
	import type { DApp } from '$lib/types/dapp';
	import Card from '$lib/components/dapps/Card.svelte';

	export let dApp: DApp;
</script>

<Card>
	<div slot="content">
		<img
			src={dApp.imageUrl || '/default-dapp-icon.png'}
			alt={dApp.name}
			class="absolute -top-9 left-4 w-20 h-20 rounded-full"
		/>
		<h2 class="text-start text-lg font-semibold">{dApp.name}</h2>
		<p class="text-start text-misty-rose m-0">{dApp.description}</p>
	</div>
	<div slot="footer">
		<div class="flex space-x-2">
			{#each dApp.tags as tag}
				<span class="bg-zumthor text-primary text-xs px-3 py-1.5 rounded-full">{tag}</span>
			{/each}
		</div>
	</div>


</Card>
