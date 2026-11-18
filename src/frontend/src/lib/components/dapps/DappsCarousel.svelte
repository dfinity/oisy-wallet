<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { rewardCampaigns, FEATURED_REWARD_CAROUSEL_SLIDE_ID } from '$env/reward-campaigns.env';
	import { CKSOL_IC_DATA } from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import cksolLogo from '$icp/assets/cksol.svg';
	import { CKSOL_CAROUSEL_SLIDE_ID } from '$icp/constants/cksol.constants';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import DappsCarouselSlide from '$lib/components/dapps/DappsCarouselSlide.svelte';
	import { AppPath, TOKEN_PARAM } from '$lib/constants/routes.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		userProfileLoaded,
		userProfileVersion,
		userSettings
	} from '$lib/derived/user-profile.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import type {
		CarouselSlideOisyDappDescription,
		OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';
	import { emit } from '$lib/utils/events.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { networkParam } from '$lib/utils/nav.utils';

	interface Props {
		styleClass?: string;
		wrapperStyleClass?: string;
	}

	let { styleClass, wrapperStyleClass }: Props = $props();

	// It may happen that the user's settings are refreshed before having been updated.
	// But for that small instant of time, we could still show the dApp.
	// To avoid this glitch, we store the dApp id in a temporary array, and we add it to the hidden dApps ids.
	let temporaryHiddenDappsIds = $state<OisyDappDescription['id'][]>([]);

	let hiddenDappsIds = $derived([
		...($userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? []),
		...temporaryHiddenDappsIds
	]);

	const featuredAirdrop: RewardCampaignDescription | undefined = rewardCampaigns.find(
		({ id }) => id === FEATURED_REWARD_CAROUSEL_SLIDE_ID
	);

	let featureAirdropSlide = $derived(
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

	// Built from the ledger id rather than from the loaded ckSOL token, so that the card opens the
	// token page even before the tokens have loaded. The page then waits for them.
	const ckSolTokenPageUrl = nonNullish(CKSOL_IC_DATA)
		? `${AppPath.Transactions}?${TOKEN_PARAM}=${CKSOL_IC_DATA.ledgerCanisterId}&${networkParam(ICP_NETWORK_ID)}`
		: undefined;

	let ckSolSlide = $derived(
		nonNullish(ckSolTokenPageUrl)
			? ({
					id: CKSOL_CAROUSEL_SLIDE_ID,
					carousel: {
						text: $i18n.carousel.text.cksol_slide_title,
						callToAction: $i18n.carousel.text.cksol_slide_cta
					},
					logo: cksolLogo,
					name: 'ckSOL'
				} as CarouselSlideOisyDappDescription)
			: undefined
	);

	/*
	 TODO: rename and adjust DappsCarousel for different data sources (not only dApps descriptions).
	 1. The component now displays data from difference sources - featured airdrop, ckSOL and dApps
	 2. We need to update all the related namings to something general.
	 3. Create a single slide data type that can be used for airdrop, dApps, and all further cases.
	 4. Adjust DappsCarouselSlide accordingly.
	 */
	let carouselSlides = $derived([
		...(nonNullish(featureAirdropSlide) ? [featureAirdropSlide] : []),
		...(nonNullish(ckSolSlide) ? [ckSolSlide] : []),
		...dAppDescriptions
	]);

	let dappsCarouselSlides = $derived(
		filterCarouselDapps({ dAppDescriptions: carouselSlides, hiddenDappsIds })
	);

	let carousel = $state<Carousel>();

	const closeSlide = async (dappId: CarouselSlideOisyDappDescription['id']) => {
		if (isNullish(carousel)) {
			return;
		}

		const idx = dappsCarouselSlides.findIndex(({ id }) => id === dappId);

		temporaryHiddenDappsIds = [...temporaryHiddenDappsIds, dappId];
		hiddenDappsIds = [...hiddenDappsIds, dappId];

		// All the slides, not only the dApps: a card left out here would lose its element while the
		// carousel keeps showing its (then empty) place.
		dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions: carouselSlides, hiddenDappsIds });

		if (idx !== -1) {
			carousel.removeSlide(idx);
		}

		if (isNullish($authIdentity)) {
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
					onCloseCarouselSlide={closeSlide}
					pageUrl={dappsCarouselSlide.id === CKSOL_CAROUSEL_SLIDE_ID
						? ckSolTokenPageUrl
						: undefined}
				/>
			{/each}
		</Carousel>
	</div>
{/if}
