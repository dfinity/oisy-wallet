<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { FeaturedOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: FeaturedOisyDappDescription;
</script>

<article class="relative flex h-64 items-end overflow-hidden rounded-2xl">
	{#if dAppDescription.screenshots.length > 0}
		<div class="absolute inset-0 bg-onahau">
			<Img
				fitHeight={true}
				height="100%"
				width="100%"
				styleClass="object-cover"
				src={dAppDescription.screenshots[0]}
				alt={replacePlaceholders($i18n.dapps.alt.website, { $dAppname: dAppDescription.name })}
			/>
		</div>
	{/if}
	<div class="z-10 flex-1 bg-black/30 px-4 py-4 backdrop-blur-sm">
		<div class="flex items-center gap-x-2">
			<div class="h-12 w-12 rounded-full">
				<Img
					src={dAppDescription.logo}
					alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppname: dAppDescription.name })}
				/>
			</div>
			<div class="flex-1">
				<h6 class="text-sm font-bold text-info-blue">{$i18n.dapps.text.featured}</h6>
				<h4 class="text-white">{dAppDescription.name}</h4>
			</div>

			<Button paddingSmall styleClass="flex-grow-0 text-sm" colorStyle="secondary" on:click>
				{$i18n.core.text.view}
			</Button>
		</div>
	</div>
</article>
