<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { userSettings } from '$lib/derived/user-profile.derived';
	import {
		type CarouselSlideOisyDappDescription,
		dAppDescriptions,
		type OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';

	export let styleClass: string | undefined = undefined;

	let hiddenDappsIds: OisyDappDescription['id'][];
	$: hiddenDappsIds = $userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? [];

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });

	let carousel: Carousel;

	const closeSlide = ({ detail: dappId }: CustomEvent<CarouselSlideOisyDappDescription['id']>) => {
		const idx = dappsCarouselSlides.findIndex(({ id }) => id === dappId);

		hiddenDappsIds = [...hiddenDappsIds, dappId];

		dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });

		if (idx !== -1) {
			carousel.removeSlide(idx);
		}
	};
</script>

{#if nonNullish($userSettings) && nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel
		bind:this={carousel}
		controlsWidthStyleClass="w-[calc(100%-5rem)]"
		styleClass={`w-full ${styleClass ?? ''}`}
	>
		{#each dappsCarouselSlides as dappsCarouselSlide (dappsCarouselSlide.id)}
			<DappsCarouselSlide {dappsCarouselSlide} on:icCloseCarouselSlide={closeSlide} />
		{/each}
	</Carousel>
{/if}
