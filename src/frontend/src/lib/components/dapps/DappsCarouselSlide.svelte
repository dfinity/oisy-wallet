<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		TRACK_COUNT_CAROUSEL_CLOSE,
		TRACK_COUNT_CAROUSEL_OPEN
	} from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { type CarouselSlideOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dappsCarouselSlide: CarouselSlideOisyDappDescription;
	export let airdrop: AirdropDescription | undefined = undefined;
	$: ({
		id: dappId,
		carousel: { text, callToAction },
		logo,
		name: dAppName
	} = dappsCarouselSlide);

	const open = async () => {
		await trackEvent({
			name: TRACK_COUNT_CAROUSEL_OPEN,
			metadata: {
				dappId
			}
		});

		if (nonNullish(airdrop)) {
			modalStore.openAirdropDetails(airdrop);
		} else {
			modalStore.openDappDetails(dappsCarouselSlide);
		}
	};

	const dispatch = createEventDispatcher();

	const close = async () => {
		await trackEvent({
			name: TRACK_COUNT_CAROUSEL_CLOSE,
			metadata: {
				dappId
			}
		});

		dispatch('icCloseCarouselSlide', dappId);
	};
</script>

<div class="flex h-full items-center justify-between">
	<div class="mr-4 shrink-0">
		<Img
			height="64"
			width="64"
			rounded
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dAppName })}
		/>
	</div>
	<div class="w-full justify-start">
		<div class="mb-1">{text}</div>
		<button
			on:click={open}
			aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppName: dAppName })}
			class="text-sm font-semibold text-brand-primary"
		>
			{callToAction} →
		</button>
	</div>
	<div class="h-full items-start">
		<button class="p-1 text-tertiary" on:click={close} aria-label={$i18n.core.text.close}>
			<IconClose size="20" />
		</button>
	</div>
</div>
