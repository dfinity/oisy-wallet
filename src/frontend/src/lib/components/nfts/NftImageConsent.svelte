<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Nft } from '$lib/types/nft';
	import Button from '$lib/components/ui/Button.svelte';
	import IconShieldHalftone from '$lib/components/icons/IconShieldHalftone.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { getAllowMediaForNft } from '$lib/utils/nfts.utils';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';

	interface Props {
		nft?: Nft;
		children: Snippet;
		showMessage?: boolean;
		type: 'hero-banner' | 'card' | 'nft-display';
	}

	const { nft, children, showMessage = true, type }: Props = $props();

	const hasConsent = $derived(
		nonNullish(nft)
			? (getAllowMediaForNft({
					tokens: $nonFungibleTokens,
					networkId: nft.collection.network.id,
					address: nft.collection.address
				}) ?? false)
			: false
	);

	const handleConsent = () => {
		if (nonNullish(nft)) {
			//hasConsent = true;
			modalStore.openNftImageConsent({ id: Symbol('NftImageConsentModal'), data: nft });
		}
	};

	const isLoading = $derived(isNullish(nft));
</script>

{#if hasConsent}
	{@render children()}
{:else}
	<div
		class="flex aspect-square h-full w-full flex-col items-center justify-center gap-2 bg-secondary-alt text-center"
		class:rounded-xl={type !== 'hero-banner'}
		class:rounded-t-xl={type === 'hero-banner'}
		class:animate-pulse={isLoading}
		class:bg-disabled-alt={isLoading}
	>
		{#if showMessage && !isLoading}
			<span class="text-tertiary"><IconShieldHalftone /></span>
			<span class="max-w-40 text-sm text-tertiary"
				>{isNullish(hasConsent)
					? $i18n.nfts.text.img_consent_none
					: $i18n.nfts.text.img_consent_disabled}</span
			>
			<span
				class="max-h-full overflow-hidden opacity-100 transition-all duration-300 ease-in-out group-hover:max-h-full group-hover:opacity-100"
				class:lg:opacity-0={type === 'card'}
				class:lg:max-h-0={type === 'card'}
			>
				<Button
					colorStyle="secondary-light"
					onclick={(e) => {
						e.preventDefault();
						handleConsent();
					}}
					styleClass="py-1 rounded-md"
					paddingSmall
				>
					{$i18n.nfts.text.review_button}
				</Button>
			</span>
		{/if}
	</div>
{/if}
