<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import MediaDisplayGuard from '$lib/components/guard/MediaDisplayGuard.svelte';
	import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Nft } from '$lib/types/nft';
	import { getNftDisplayMediaStatus } from '$lib/utils/nft.utils';
    import {MediaStatusEnum} from "$lib/enums/media-status";

	interface Props {
		nft?: Nft;
		children: Snippet;
		showMessage?: boolean;
		type: 'hero-banner' | 'card' | 'card-selectable' | 'nft-display' | 'nft-logo';
		location?: { source: string; subSource: string };
	}

	const { nft, children, showMessage = true, type, location }: Props = $props();

	const mediaStatus = $derived(
		nonNullish(nft) ? getNftDisplayMediaStatus(nft) : MediaStatusEnum.INVALID_DATA
	);

	const hasConsent: boolean | undefined = $derived(
		nonNullish(nft) ? nft.collection.allowExternalContentSource : false
	);

	const handleConsent = () => {
		if (nonNullish(nft)) {
			trackEvent({
				name: PLAUSIBLE_EVENTS.OPEN_MODAL,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
					event_subcontext: 'media_review',
					location_source: location?.source ?? '',
					location_subsource: location?.subSource ?? '',
					token_name: nft.collection.name ?? '',
					token_address: nft.collection.address,
					token_network: nft.collection.network.name,
					token_standard: nft.collection.standard.code
				}
			});

			modalStore.openNftImageConsent({ id: Symbol('NftImageConsentModal'), data: nft.collection });
		}
	};

	const isLoading = $derived(isNullish(nft));
</script>

<MediaDisplayGuard
	{children}
	{hasConsent}
	loading={isLoading}
	{mediaStatus}
	onConsentReview={handleConsent}
	{showMessage}
	{type}
/>
