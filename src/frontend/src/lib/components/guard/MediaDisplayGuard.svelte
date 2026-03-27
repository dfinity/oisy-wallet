<script lang="ts">
	import { preventDefault, stopPropagation } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconShieldHalftone from '$lib/components/icons/IconShieldHalftone.svelte';
	import FilesizeLimitExceededImage from '$lib/components/icons/nfts/FilesizeLimitExceeded.svelte';
	import InvalidDataImage from '$lib/components/icons/nfts/InvalidData.svelte';
	import UnsupportedMediaTypeImage from '$lib/components/icons/nfts/UnsupportedMediaType.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { MediaStatusEnum } from '$lib/enums/media-status';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		type: 'hero-banner' | 'card' | 'card-selectable' | 'nft-display' | 'nft-logo';
		mediaStatus: MediaStatusEnum;
		hasConsent?: boolean;
		loading?: boolean;
		showMessage?: boolean;
		onConsentReview: () => void;
		children: Snippet;
	}

	const {
		type,
		mediaStatus,
		hasConsent,
		loading = false,
		showMessage = true,
		onConsentReview,
		children
	}: Props = $props();

	let hoveredReviewButton = $derived(type === 'card' && nonNullish(hasConsent));
</script>

{#if nonNullish(hasConsent) && hasConsent}
	{#if mediaStatus === MediaStatusEnum.OK}
		{@render children()}
	{:else if mediaStatus === MediaStatusEnum.INVALID_DATA}
		<InvalidDataImage />
	{:else if mediaStatus === MediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE}
		<UnsupportedMediaTypeImage />
	{:else if mediaStatus === MediaStatusEnum.FILESIZE_LIMIT_EXCEEDED}
		<FilesizeLimitExceededImage />
	{/if}
{:else}
	<div
		class="flex aspect-square h-full w-full flex-col items-center justify-center gap-2 bg-brand-light-alt text-center"
		class:animate-pulse={loading}
		class:bg-disabled-alt={loading}
		class:rounded-t-xl={type === 'hero-banner'}
		class:rounded-xl={type !== 'hero-banner'}
	>
		{#if showMessage && !loading}
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
						onclick={preventDefault(stopPropagation(onConsentReview))}
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
