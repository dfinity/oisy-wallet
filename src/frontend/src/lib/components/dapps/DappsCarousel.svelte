<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userProfileLoaded, userSettings } from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import {
		type CarouselSlideOisyDappDescription,
		type OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';
	import { emit } from '$lib/utils/events.utils';

	export let styleClass: string | undefined = undefined;

	// It may happen that the user's settings are refreshed before having been updated.
	// But for that small instant of time, we could still show the dApp.
	// To avoid this glitch we store the dApp id in a temporary array, and we add it to the hidden dApps ids.
	let temporaryHiddenDappsIds: OisyDappDescription['id'][] = [];

	let hiddenDappsIds: OisyDappDescription['id'][];
	$: hiddenDappsIds = [
		...($userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? []),
		...temporaryHiddenDappsIds
	];

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });

	let carousel: Carousel;

	const closeSlide = async ({
		detail: dappId
	}: CustomEvent<CarouselSlideOisyDappDescription['id']>) => {
		const idx = dappsCarouselSlides.findIndex(({ id }) => id === dappId);

		temporaryHiddenDappsIds = [...temporaryHiddenDappsIds, dappId];
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

{#if $userProfileLoaded && nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
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
