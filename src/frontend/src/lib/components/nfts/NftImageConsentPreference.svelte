<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Nft } from '$lib/types/nft';
	import { getAllowMediaForNft } from '$lib/utils/nfts.utils';

	interface Props {
		nft: Nft;
	}

	const { nft }: Props = $props();

	const hasConsent = $derived(
		nonNullish(nft)
			? getAllowMediaForNft({
					tokens: $nonFungibleTokens,
					networkId: nft.collection.network.id,
					address: nft.collection.address
				})
			: false
	);

	const openConsentModal = () => {
		if (nonNullish(nft)) {
			modalStore.openNftImageConsent({ id: Symbol(), data: nft.collection });
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
		colorStyle="secondary-light"
		onclick={openConsentModal}
		styleClass="w-auto p-0 grow-0 text-nowrap hover:bg-inherit ml-2"
		transparent>{$i18n.nfts.text.review_preference}</Button
	>
</span>
