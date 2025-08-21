<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Nft } from '$lib/types/nft';
	import Button from '$lib/components/ui/Button.svelte';
	import IconShieldHalftone from '$lib/components/icons/IconShieldHalftone.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		nft?: Nft;
		children: Snippet;
		showMessage?: boolean;
		noBg?: boolean;
		asHeroBanner?: boolean;
	}

	const { nft, children, showMessage = true, noBg = false, asHeroBanner = false }: Props = $props();

	let hasConsent = $state();

	const handleConsent = () => {
		if (nonNullish(nft)) {
			modalStore.openNftImageConsent({ id: Symbol('NftImageConsentModal'), data: nft });
		}
	};

	const isLoading = $derived(isNullish(nft));
</script>

{#if hasConsent}
	{@render children()}
{:else}
	<div
		class="flex aspect-square h-full w-full flex-col items-center justify-center gap-2 text-center"
		class:bg-secondary-alt={!noBg}
		class:rounded-xl={!asHeroBanner}
		class:rounded-t-xl={asHeroBanner}
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
				class="max-h-full overflow-hidden opacity-100 transition-all duration-300 ease-in-out group-hover:max-h-full group-hover:opacity-100 lg:max-h-0 lg:opacity-0"
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
