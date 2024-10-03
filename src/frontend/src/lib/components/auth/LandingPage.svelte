<script lang="ts">
	import PreviewLarge from '$lib/assets/preview-large.png';
	import PreviewSmall from '$lib/assets/preview-small.png';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	let ariaLabel: string;
	$: ariaLabel = replaceOisyPlaceholders($i18n.auth.alt.preview);
</script>

<div
	class="m-auto grid w-full max-w-screen-2.5xl grid-cols-1 flex-col items-center gap-12 overflow-hidden px-5 md:grid-cols-2 md:grid-rows-1 md:items-start md:gap-8 md:overflow-visible"
>
	<div
		class="flex w-full flex-1 flex-col items-center text-center md:items-start md:pl-8 md:pt-12 md:text-left"
	>
		<div class="md:absolute md:top-1/3">
			<HeroSignIn />
		</div>
	</div>

	<div class=" min-w-[1127px] flex-1 md:pt-12">
		<picture aria-label={ariaLabel} class="w-full" role="presentation">
			<source srcset={PreviewSmall} media="(max-width: 767px)" />
			<Img src={PreviewLarge} alt={ariaLabel} />
		</picture>
	</div>
</div>
