<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		TRACK_COUNT_CAROUSEL_CLOSE,
		TRACK_COUNT_CAROUSEL_OPEN
	} from '$lib/constants/analytics.constants';
	import type { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { CarouselSlideOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { networkUrl } from '$lib/utils/nav.utils';

	interface Props {
		dappsCarouselSlide: CarouselSlideOisyDappDescription;
		airdrop?: RewardCampaignDescription;
		pagePath?: AppPath;
		onCloseCarouselSlide: (dappId: CarouselSlideOisyDappDescription['id']) => void;
	}

	let { dappsCarouselSlide, airdrop, pagePath, onCloseCarouselSlide }: Props = $props();

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let {
		id: dappId,
		carousel: { text, callToAction },
		logo,
		name: dAppName
	} = $derived(dappsCarouselSlide);

	const rewardModalId = Symbol();
	const dappModalId = Symbol();

	const open = () => {
		trackEvent({
			name: TRACK_COUNT_CAROUSEL_OPEN,
			metadata: {
				dappId
			}
		});

		if (nonNullish(airdrop)) {
			modalStore.openRewardDetails({ id: rewardModalId, data: airdrop });
		} else if (nonNullish(pagePath)) {
			goto(
				networkUrl({
					path: pagePath,
					networkId: $networkId,
					usePreviousRoute: true,
					fromRoute
				})
			);
		} else {
			modalStore.openDappDetails({ id: dappModalId, data: dappsCarouselSlide });
		}
	};

	const close = () => {
		trackEvent({
			name: TRACK_COUNT_CAROUSEL_CLOSE,
			metadata: {
				dappId
			}
		});

		onCloseCarouselSlide(dappId);
	};
</script>

<div class="flex h-full w-full items-center justify-between">
	<div class="mr-4 flex">
		<Img
			alt={replacePlaceholders($i18n.dapps.alt.logo, {
				$dAppName: resolveText({ i18n: $i18n, path: dAppName })
			})}
			height="64"
			rounded
			src={logo}
			width="64"
		/>
	</div>
	<div class="flex flex-1 flex-col justify-start">
		<div class="mb-1">{resolveText({ i18n: $i18n, path: text })}</div>
		<button
			class="text-sm font-semibold text-brand-primary-alt"
			aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, {
				$dAppName: resolveText({ i18n: $i18n, path: dAppName })
			})}
			onclick={open}
		>
			{resolveText({ i18n: $i18n, path: callToAction })} →
		</button>
	</div>
	<div class="flex h-full items-start">
		<button class="p-1 text-tertiary" aria-label={$i18n.core.text.close} onclick={close}>
			<IconClose size="20" />
		</button>
	</div>
</div>
