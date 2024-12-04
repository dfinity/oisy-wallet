<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { authIdentity, authSignedIn } from '$lib/derived/auth.derived';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import {
		type CarouselSlideOisyDappDescription,
		dAppDescriptions
	} from '$lib/types/dapp-description';
	import type { OptionIdentity } from '$lib/types/identity';

	export let styleClass: string | undefined = undefined;

	let identity: OptionIdentity;
	$: identity = $authIdentity;

	$: {
		if ($authSignedIn) {
			loadUserProfile({ identity });
		}
	}

	let temporaryHiddenDappIds: CarouselSlideOisyDappDescription['id'][] = [];

	const hideCarouselDapp = (
		event: CustomEvent<{ dappId: CarouselSlideOisyDappDescription['id'] }>
	) => {
		temporaryHiddenDappIds = [...temporaryHiddenDappIds, event.detail.dappId];
	};


	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = isNullish($userProfileStore)
		? []
		: (dAppDescriptions.filter(
				({ id, carousel }) =>
					nonNullish(carousel) &&
					!(
						fromNullable($userProfileStore.profile.settings)?.dapp.dapp_carousel.hidden_dapp_ids?.includes(id) ||
						temporaryHiddenDappIds.includes(id)
					)
			) as CarouselSlideOisyDappDescription[]);
</script>

{#if nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
	<Carousel controlsWidthStyleClass="w-[calc(100%-5rem)]" styleClass={`w-full ${styleClass ?? ''}`}>
		{#each dappsCarouselSlides as dappsCarouselSlide}
			<DappsCarouselSlide {dappsCarouselSlide} on:icHideCarouselDapp={hideCarouselDapp} />
		{/each}
	</Carousel>
{/if}
