<script lang="ts">
	import background from '$lib/assets/background.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="fixed inset-0 z-[-1] overflow-hidden bg-white">
	<picture
		class="absolute left-1/2 top-0 w-full min-w-[1280px] -translate-x-1/2 transform"
		aria-label={replaceOisyPlaceholders($i18n.core.alt.background)}
	>
		<source srcset={background} media="(min-width: 641px)" />
		<Img src="" />
	</picture>
</div>
