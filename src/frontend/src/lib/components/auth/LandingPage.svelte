<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel: string;
	$: ariaLabel = replaceOisyPlaceholders($i18n.auth.alt.preview);
</script>

<div
	class="min-h-96 gap-12 px-5 md:gap-8 m-auto h-full w-full max-w-screen-2.5xl items-start md:grid md:grid-cols-2 md:grid-rows-1 md:overflow-visible"
>
	<div class="md:pt-12 md:pl-8 w-full content-center md:h-full md:flex-1">
		<HeroSignIn />
	</div>

	<!-- TODO: determine if this value is specific/permanent or can be changed -->
	<div
		class="pt-12 md:m-0 ml-auto min-w-[1127px] md:flex md:h-full md:content-center md:items-center"
	>
		<div class="w-full md:h-md:mt-auto">
			{#await import(`$lib/assets/main_image-${$themeStore ?? 'light'}.webp`) then { default: src }}
				<Img {src} alt={ariaLabel} />
			{/await}
		</div>
	</div>
</div>
