<script lang="ts">
	import type { DApp } from '$lib/types/dapp';
	import Card from '$lib/components/dapps/Card.svelte';

	export let dApp: DApp;
</script>

<Card class="{$$restProps.class  || ''}">
	<svelte:fragment slot="content">
		<img
			src={dApp.imageUrl}
			alt={dApp.name}
			class="absolute -top-9 left-4 w-20 h-20 rounded-full"
		/>
		<h2 class="text-start text-lg font-semibold">{dApp.name}</h2>
		<p class="text-start text-misty-rose m-0 line-clamp-3">{dApp.description}</p>
	</svelte:fragment>
	<div slot="footer">
		<div class="flex space-x-2">
			{#each dApp.tags as tag}
				<span class="bg-light-blue text-primary text-xs px-3 py-1.5 rounded-full">{tag}</span>
			{/each}
		</div>
	</div>


</Card>
