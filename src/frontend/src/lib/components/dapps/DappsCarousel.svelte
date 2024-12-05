<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import {
		type CarouselSlideOisyDappDescription,
		dAppDescriptions
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import { emit } from '$lib/utils/events.utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	export let styleClass: string | undefined = undefined;

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = filterCarouselDapps(dAppDescriptions);

	const closeSlide = async ({ detail:  dappId   }: CustomEvent<CarouselSlideOisyDappDescription['id'] >) => {
		if (isNullish($authIdentity) || isNullish($userProfileStore)) {
			return;
		}

		await addUserHiddenDappId({
			dappId,
			identity: $authIdentity,
			currentUserVersion: fromNullable($userProfileStore.profile.version)
		});

		emit({ message: 'oisyRefreshUserProfile' });
	};
</script>

{#if nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel controlsWidthStyleClass="w-[calc(100%-5rem)]" styleClass={`w-full ${styleClass ?? ''}`}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} on:icCloseCarouselSlide={closeSlide} />
		{/each}
	</Carousel>
{/if}
