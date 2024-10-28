<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import {
		dAppDescriptions,
		type CarouselSlideOisyDappDescription
	} from '$lib/types/oisyDappDescription';

	export let styleClass: string | undefined = undefined;

	const dappsCarouselSlides = dAppDescriptions.filter(({ carousel }) =>
		nonNullish(carousel)
	) as CarouselSlideOisyDappDescription[];
</script>

{#if nonNullish(dappsCarouselSlides)}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel controlsWidthStyleClass="w-[calc(100%-5rem)]" styleClass={`w-full ${styleClass ?? ''}`}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} />
		{/each}
	</Carousel>
{/if}
