<script lang="ts">
	import noNftsBanner from '$lib/assets/nfts/no-nfts-banner.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex flex-col items-center gap-5 px-6 py-10">
	<Img alt={$i18n.nfts.alt.placeholder_image} src={noNftsBanner} />

	<div class="flex flex-col items-center gap-2">
		<h5>{$i18n.nfts.text.title_empty}</h5>
	</div>
	<span class="text-tertiary">{$i18n.nfts.text.description_empty}</span>
</div>
