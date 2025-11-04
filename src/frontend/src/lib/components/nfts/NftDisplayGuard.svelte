<script lang="ts">
	import { preventDefault, stopPropagation } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconShieldHalftone from '$lib/components/icons/IconShieldHalftone.svelte';
	import FilesizeLimitExceededImage from '$lib/components/icons/nfts/FilesizeLimitExceeded.svelte';
	import InvalidDataImage from '$lib/components/icons/nfts/InvalidData.svelte';
	import UnsupportedMediaTypeImage from '$lib/components/icons/nfts/UnsupportedMediaType.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
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
		location?: { source: string; subSource: string };
	}

	const { nft, children, showMessage = true, type, location }: Props = $props();

	const mediaStatus = $derived(
		nonNullish(nft)
			? nft.id === '10570'
				? NftMediaStatusEnum.FILESIZE_LIMIT_EXCEEDED
				: nft.mediaStatus
			: NftMediaStatusEnum.INVALID_DATA
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
					token_standard: nft.collection.standard
				}
			});

			modalStore.openNftImageConsent({ id: Symbol('NftImageConsentModal'), data: nft.collection });
		}
	};

	const isLoading = $derived(isNullish(nft));

	let hoveredReviewButton = $derived(type === 'card' && nonNullish(hasConsent));
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
					class="overflow-hidden"
					class:duration-300={hoveredReviewButton}
					class:ease-in-out={hoveredReviewButton}
					class:lg:group-hover:max-h-full={hoveredReviewButton}
					class:lg:group-hover:opacity-100={hoveredReviewButton}
					class:max-h-0={hoveredReviewButton}
					class:max-h-full={!hoveredReviewButton}
					class:opacity-0={hoveredReviewButton}
					class:opacity-100={!hoveredReviewButton}
					class:transition-all={hoveredReviewButton}
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
