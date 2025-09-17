<script lang="ts">
	import { preventDefault, stopPropagation } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconShieldHalftone from '$lib/components/icons/IconShieldHalftone.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Nft } from '$lib/types/nft';
	import { getAllowMediaForNft } from '$lib/utils/nfts.utils';

	interface Props {
		nft?: Nft;
		children: Snippet;
		showMessage?: boolean;
		type: 'hero-banner' | 'card' | 'card-selectable' | 'nft-display' | 'nft-logo';
	}

	const { nft, children, showMessage = true, type }: Props = $props();

	const hasConsent: boolean | undefined = $derived(
		nonNullish(nft)
			? getAllowMediaForNft({
					tokens: $nonFungibleTokens,
					networkId: nft.collection.network.id,
					address: nft.collection.address
				})
			: false
	);

	const handleConsent = () => {
		if (nonNullish(nft)) {
			modalStore.openNftImageConsent({ id: Symbol('NftImageConsentModal'), data: nft.collection });
		}
	};

	const isLoading = $derived(isNullish(nft));
</script>

{#if nonNullish(hasConsent) && hasConsent}
	{@render children()}
{:else}
	<div
		class="flex aspect-square h-full w-full flex-col items-center justify-center gap-2 bg-secondary-alt text-center"
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
					class:lg:max-h-0={type === 'card'}
					class:lg:opacity-0={type === 'card'}
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
