<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userSettings } from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import {
		type CarouselSlideOisyDappDescription,
		dAppDescriptions,
		type OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';
	import { emit } from '$lib/utils/events.utils';

	export let styleClass: string | undefined = undefined;

	let hiddenDappsIds: OisyDappDescription['id'][];
	$: hiddenDappsIds = $userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? [];

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });

	let carousel: Carousel;

	const closeSlide = async ({
		detail: dappId
	}: CustomEvent<CarouselSlideOisyDappDescription['id']>) => {
		const idx = dappsCarouselSlides.findIndex(({ id }) => id === dappId);

		hiddenDappsIds = [...hiddenDappsIds, dappId];

		dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });

		if (idx !== -1) {
			carousel.removeSlide(idx);
		}

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish($userProfileStore)) {
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

{#if $userSettings !== undefined && nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
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
