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
	<Carousel {styleClass}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} />
		{/each}
	</Carousel>
{/if}
