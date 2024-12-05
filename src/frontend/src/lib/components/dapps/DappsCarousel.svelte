<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import {
		type CarouselSlideOisyDappDescription,
		dAppDescriptions,
		type OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';

	export let styleClass: string | undefined = undefined;

	let hiddenDappsIds: OisyDappDescription['id'][];
	$: hiddenDappsIds = $userProfileStore?.profile.settings.dapp.dapp_carousel.hidden_dapp_ids ?? [];

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });
</script>

{#if nonNullish($userProfileStore) && nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel controlsWidthStyleClass="w-[calc(100%-5rem)]" styleClass={`w-full ${styleClass ?? ''}`}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} />
		{/each}
	</Carousel>
{/if}
