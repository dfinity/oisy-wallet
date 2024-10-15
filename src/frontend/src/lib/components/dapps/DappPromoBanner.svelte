<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { DApp } from '$lib/types/dapp';
	import Img from '$lib/components/ui/Img.svelte';

	export let dApp: DApp;
</script>

<article
	class="relative flex h-64 items-end overflow-hidden rounded-2xl"
>
	{#if dApp.imageUrl}
		<div class="absolute">
			<Img src={dApp.imageUrl} alt={dApp.name}/>
		</div>
	{/if}
	<div class="flex-1 px-4 py-4 backdrop-blur-sm">
		<div class="flex items-center gap-x-2">
			<div class="h-12 w-12 rounded-full">
				<Img  src={dApp.logoUrl} alt={dApp.name} />
			</div>
			<div class="flex-1">
				<h6 class="text-sm font-bold text-info">{$i18n.dapps.text.featured}</h6>
				<h4 class="text-white">{dApp.name}</h4>
			</div>
			<a href={dApp.url} target="_blank" class="no-underline">
				<Button size="sm" colorStyle="secondary" styleClass="flex-grow-0"
				>{$i18n.core.text.view}</Button
				>
			</a>
		</div>
	</div>
</article>

<style lang="css">
</style>
