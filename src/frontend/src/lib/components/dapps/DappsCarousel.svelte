<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import { rewardCampaigns, FEATURED_REWARD_CAROUSEL_SLIDE_ID } from '$env/reward-campaigns.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		userProfileLoaded,
		userProfileVersion,
		userSettings
	} from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import type {
		CarouselSlideOisyDappDescription,
		OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';
	import { emit } from '$lib/utils/events.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		styleClass?: string;
		wrapperStyleClass?: string;
	}

	let { styleClass, wrapperStyleClass }: Props = $props();

	// It may happen that the user's settings are refreshed before having been updated.
	// But for that small instant of time, we could still show the dApp.
	// To avoid this glitch we store the dApp id in a temporary array, and we add it to the hidden dApps ids.
	let temporaryHiddenDappsIds: OisyDappDescription['id'][] = $state([]);

	let hiddenDappsIds: OisyDappDescription['id'][] = $state();
	run(() => {
		hiddenDappsIds = [
			...($userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? []),
			...temporaryHiddenDappsIds
		];
	});

	const featuredAirdrop: RewardCampaignDescription | undefined = rewardCampaigns.find(
		({ id }) => id === FEATURED_REWARD_CAROUSEL_SLIDE_ID
	);

	let featureAirdropSlide: CarouselSlideOisyDappDescription | undefined = $derived(
		nonNullish(featuredAirdrop)
			? ({
					id: featuredAirdrop.id,
					carousel: {
						text: replaceOisyPlaceholders($i18n.rewards.text.carousel_slide_title),
						callToAction: $i18n.rewards.text.carousel_slide_cta
					},
					logo: featuredAirdrop.logo,
					name: featuredAirdrop.title
				} as CarouselSlideOisyDappDescription)
			: undefined
	);

	/*
	 TODO: rename and adjust DappsCarousel for different data sources (not only dApps descriptions).
	 1. The component now displays data from difference sources - featured airdrop and dApps
	 2. We need to update all the related namings to something general.
	 3. Create a single slide data type that can be used for airdrop, dApps, and all further cases.
	 4. Adjust DappsCarouselSlide accordingly.
	 */
	let dappsCarouselSlides: CarouselSlideOisyDappDescription[] = $state();
	run(() => {
		dappsCarouselSlides = filterCarouselDapps({
			dAppDescriptions: [
				...(nonNullish(featureAirdropSlide) ? [featureAirdropSlide] : []),
				...dAppDescriptions
			],
			hiddenDappsIds
		});
	});

	let carousel: Carousel = $state();

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
			currentUserVersion: $userProfileVersion
		});

		emit({ message: 'oisyRefreshUserProfile' });
	};
</script>

{#if $userProfileLoaded && nonNullish(dappsCarouselSlides) && dappsCarouselSlides.length > 0}
	<div class={wrapperStyleClass ?? ''}>
		<!-- To align controls section with slide text - 100% - logo width (4rem) - margin logo-text (1rem) -->
		<Carousel
			bind:this={carousel}
			controlsWidthStyleClass="w-[calc(100%-5rem)]"
			styleClass={`w-full ${styleClass ?? ''}`}
		>
			{#each dappsCarouselSlides as dappsCarouselSlide (dappsCarouselSlide.id)}
				<DappsCarouselSlide
					airdrop={nonNullish(featuredAirdrop) && featuredAirdrop.id === dappsCarouselSlide.id
						? featuredAirdrop
						: undefined}
					{dappsCarouselSlide}
					on:icCloseCarouselSlide={closeSlide}
				/>
			{/each}
		</Carousel>
	</div>
{/if}
