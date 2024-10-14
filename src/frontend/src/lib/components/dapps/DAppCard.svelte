<script lang="ts">
	import Card from '$lib/components/dapps/Card.svelte';
	import type { DApp } from '$lib/types/dapp';

	export let dApp: DApp;
</script>

<Card class={$$restProps.class || ''}>
	<svelte:fragment slot="content">
		<img
			src={dApp.imageUrl}
			alt={dApp.name}
			class="absolute -top-9 left-4 h-20 w-20 rounded-full"
		/>
		<h2 class="text-start text-lg font-semibold">{dApp.name}</h2>
		<p class="m-0 line-clamp-3 text-start text-misty-rose">{dApp.description}</p>
	</svelte:fragment>
	<div slot="footer">
		<div class="flex space-x-2">
			{#each dApp.tags as tag}
				<span class="text-primary rounded-full bg-light-blue px-3 py-1.5 text-xs">{tag}</span>
			{/each}
		</div>
	</div>
</Card>
