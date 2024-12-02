<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import {
		dAppDescriptions,
		type CarouselSlideOisyDappDescription
	} from '$lib/types/dapp-description';

	export let styleClass: string | undefined = undefined;

	const dappsCarouselSlides = [dAppDescriptions[0]].filter(
		({ id, carousel }) =>
			nonNullish(carousel) &&
			!$userProfileStore?.profile.settings.dapp.dapp_carousel.hidden_dapp_ids?.includes(id)
	) as CarouselSlideOisyDappDescription[];
</script>

{#if nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel controlsWidthStyleClass="w-[calc(100%-5rem)]" styleClass={`w-full ${styleClass ?? ''}`}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} />
		{/each}
	</Carousel>
{/if}
