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
	import { onDestroy } from 'svelte';

	export let styleClass: string | undefined = undefined;

	let hiddenDappsIds: OisyDappDescription['id'][];
	$: hiddenDappsIds = $userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? [];

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
		$: dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });

	let carousel: Carousel;

	let dapp: CarouselSlideOisyDappDescription | undefined

	// every 5 seconds remove a dapp from the carousel, then 5 seconds later, add it again
	const interval = setInterval(() => {
		if (nonNullish(carousel)) {
			if (nonNullish(dapp)) {
				dappsCarouselSlides.push(dapp);
				dapp = undefined;
			} else {
				dapp = dappsCarouselSlides.shift();
			}
			console.log('dapp', dapp);
			carousel.refreshSlides();
		}
	}, 5000);

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

{#if nonNullish($userSettings) && nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel bind:this={carousel} controlsWidthStyleClass="w-[calc(100%-5rem)]" styleClass={`w-full ${styleClass ?? ''}`}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} />
		{/each}
	</Carousel>
{/if}
