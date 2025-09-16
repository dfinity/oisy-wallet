<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component } from 'svelte';
	import noNftImage from '$lib/assets/nfts/no-nft-image.svg';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Nft } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import { logoSizes } from '$lib/constants/components.constants';

	interface Props {
		nft: Nft;
		logoSize?: LogoSize;
		color?: 'off-white' | 'white';
		ring?: boolean;
		badge?: { type: 'network' } | { type: 'icon'; icon: Component; ariaLabel: string };
		testId?: string;
		badgeTestId?: string;
	}

	let {
		nft,
		logoSize = 'lg',
		color = 'off-white',
		ring = false,
		badge,
		testId,
		badgeTestId
	}: Props = $props();

	const {
		imageUrl,
		name,
		collection: { network }
	} = $derived(nft);
</script>

<div class="bg-primary/80 relative rounded-xl">
	<div style={`width: ${logoSizes[logoSize]}; height: ${logoSizes[logoSize]};`}>
		<NftImageConsent {nft} type="nft-logo">
			<Logo
				alt={replacePlaceholders($i18n.core.alt.logo, { $name: name ?? '' })}
				circle={false}
				{color}
				{ring}
				size={logoSize}
				src={imageUrl ?? noNftImage}
				{testId}
			/>
		</NftImageConsent>
	</div>

	{#if nonNullish(badge) && badge?.type === 'network'}
		<div
			class="absolute -bottom-1"
			class:-right-1={logoSize !== 'xs'}
			class:-right-1.75={logoSize === 'xs'}
			class:scale-60={logoSize === 'xs'}
		>
			<NetworkLogo {color} {network} testId={`network-${badgeTestId}`} />
		</div>
	{:else if nonNullish(badge) && badge?.type === 'icon'}
		<div
			class="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-brand-tertiary p-1 text-primary-inverted"
			aria-label={badge.ariaLabel}
			data-tid={`icon-${badgeTestId}`}
		>
			<badge.icon size="16" />
		</div>
	{/if}
</div>
