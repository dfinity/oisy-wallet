<script lang="ts">
	import previewLarge from '$lib/assets/preview-large.webp';
	import previewSmall from '$lib/assets/preview-small.webp';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	let ariaLabel: string;
	$: ariaLabel = replaceOisyPlaceholders($i18n.auth.alt.preview);
</script>

<div
	class="m-auto flex h-full w-full max-w-screen-2.5xl flex-col items-start gap-12 overflow-hidden px-5 md:grid md:grid-cols-2 md:grid-rows-1 md:gap-8 md:overflow-visible"
>
	<div class="h-full w-full content-center md:flex-1 md:pl-8 md:pt-12">
		<HeroSignIn />
	</div>

	<!-- TODO: determine if this value is specific/permanent or can be changed -->
	<div
		class="ml-auto min-w-[1127px] md:m-0 md:flex md:h-full md:content-center md:items-center md:pt-12"
	>
		<picture aria-label={ariaLabel} class="w-full md:mt-auto" role="presentation">
			<source srcset={previewSmall} media="(max-width: 767px)" />
			<Img src={previewLarge} alt={ariaLabel} />
		</picture>
	</div>
</div>
