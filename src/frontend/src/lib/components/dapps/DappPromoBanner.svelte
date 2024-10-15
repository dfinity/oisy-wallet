<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { DApp } from '$lib/types/dapp';
	import Img from '$lib/components/ui/Img.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dApp: DApp;
</script>

<article
	class="relative flex h-64 items-end overflow-hidden rounded-2xl"
>
	{#if dApp.imageUrl}
		<div class="absolute">
			<Img src={dApp.imageUrl} alt={dApp.name} />
		</div>
	{/if}
	<div class="flex-1 px-4 py-4 backdrop-blur-sm">
		<div class="flex items-center gap-x-2">
			<div class="h-12 w-12 rounded-full">
				<Img src={dApp.logoUrl} alt={dApp.name} />
			</div>
			<div class="flex-1">
				<h6 class="text-sm font-bold">{$i18n.dapps.text.featured}</h6>
				<h4 class="text-white">{dApp.name}</h4>
			</div>

			<a rel="external noopener noreferrer"
				 aria-label={replacePlaceholders($i18n.dapps.alt.open_dapp, {'$dAppname': dApp.name})} href={dApp.url}
				 target="_blank"
				 class="as-button secondary no-underline">{$i18n.core.text.view}
			</a>

		</div>
	</div>
</article>

<style lang="css">
</style>
