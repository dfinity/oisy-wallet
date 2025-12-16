<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		type PLAUSIBLE_EVENT_SOURCES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { NftCollection } from '$lib/types/nft';

	interface Props {
		collection: NftCollection;
		source: PLAUSIBLE_EVENT_SOURCES.NFT_PAGE | PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION;
	}

	const { collection, source }: Props = $props();

	const hasConsent = $derived(
		nonNullish(collection) ? collection.allowExternalContentSource : false
	);

	const openConsentModal = () => {
		if (nonNullish(collection)) {
			trackEvent({
				name: PLAUSIBLE_EVENTS.OPEN_MODAL,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
					event_subcontext: 'media_review',
					location_source: source,
					location_subsource: 'list',
					token_name: collection.name ?? '',
					token_address: collection.address,
					token_network: collection.network.name,
					token_standard: collection.standard
				}
			});
			modalStore.openNftImageConsent({ id: Symbol(), data: collection });
		}
	};
</script>

<span class="flex items-center text-right">
	{#if hasConsent}
		{$i18n.nfts.text.media_enabled}
	{:else}
		{$i18n.nfts.text.media_disabled}
	{/if}
	<Button
		ariaLabel={$i18n.nfts.alt.review_preference}
		colorStyle="secondary-light"
		onclick={openConsentModal}
		styleClass="w-auto p-0 grow-0 text-nowrap hover:bg-inherit ml-2"
		transparent
	>
		{$i18n.nfts.text.review_preference}
	</Button>
</span>
