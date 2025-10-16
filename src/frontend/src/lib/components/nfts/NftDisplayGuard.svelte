<script lang="ts">
	import { preventDefault, stopPropagation } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconShieldHalftone from '$lib/components/icons/IconShieldHalftone.svelte';
	import FilesizeLimitExceededImage from '$lib/components/icons/nfts/FilesizeLimitExceeded.svelte';
	import InvalidDataImage from '$lib/components/icons/nfts/InvalidData.svelte';
	import UnsupportedMediaTypeImage from '$lib/components/icons/nfts/UnsupportedMediaType.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { TRACK_NFT_OPEN_CONSENT_MODAL } from '$lib/constants/analytics.constants';
	import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nft?: Nft;
		children: Snippet;
		showMessage?: boolean;
		type: 'hero-banner' | 'card' | 'card-selectable' | 'nft-display' | 'nft-logo';
	}

	const { nft, children, showMessage = true, type }: Props = $props();

	const mediaStatus = $derived(nonNullish(nft) ? nft.mediaStatus : NftMediaStatusEnum.INVALID_DATA);

	const hasConsent: boolean | undefined = $derived(
		nonNullish(nft) ? nft.collection.allowExternalContentSource : false
	);

	const handleConsent = () => {
		if (nonNullish(nft)) {
			trackEvent({
				name: TRACK_NFT_OPEN_CONSENT_MODAL,
				metadata: {
					collection_name: nft.collection.name ?? '',
					collection_address: nft.collection.address,
					network: nft.collection.network.name,
					standard: nft.collection.standard
				}
			});

			modalStore.openNftImageConsent({ id: Symbol('NftImageConsentModal'), data: nft.collection });
		}
	};

	const isLoading = $derived(isNullish(nft));
</script>

{#if nonNullish(hasConsent) && hasConsent}
	{#if mediaStatus === NftMediaStatusEnum.OK}
		{@render children()}
	{:else if mediaStatus === NftMediaStatusEnum.INVALID_DATA}
		<InvalidDataImage />
	{:else if mediaStatus === NftMediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE}
		<UnsupportedMediaTypeImage />
	{:else if mediaStatus === NftMediaStatusEnum.FILESIZE_LIMIT_EXCEEDED}
		<FilesizeLimitExceededImage />
	{/if}
{:else}
	<div
		class="flex aspect-square h-full w-full flex-col items-center justify-center gap-2 bg-brand-light-alt text-center"
		class:animate-pulse={isLoading}
		class:bg-disabled-alt={isLoading}
		class:rounded-t-xl={type === 'hero-banner'}
		class:rounded-xl={type !== 'hero-banner'}
	>
		{#if showMessage && !isLoading}
			<span class="text-tertiary"><IconShieldHalftone /></span>
			{#if type !== 'nft-logo'}
				<span class="max-w-40 text-sm text-tertiary"
					>{isNullish(hasConsent)
						? $i18n.nfts.text.img_consent_none
						: $i18n.nfts.text.img_consent_disabled}</span
				>
			{/if}
			{#if type !== 'card-selectable' && type !== 'nft-logo'}
				<span
					class="max-h-full overflow-hidden opacity-100 transition-all duration-300 ease-in-out group-hover:max-h-full group-hover:opacity-100"
					class:lg:max-h-0={type === 'card' && nonNullish(hasConsent)}
					class:lg:opacity-0={type === 'card' && nonNullish(hasConsent)}
				>
					<Button
						colorStyle="secondary-light"
						onclick={preventDefault(stopPropagation(handleConsent))}
						paddingSmall
						styleClass="py-1 rounded-md"
					>
						{$i18n.nfts.text.review_button}
					</Button>
				</span>
			{/if}
		{/if}
	</div>
{/if}
