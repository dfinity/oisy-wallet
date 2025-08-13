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

<div class="relative">
	<Logo
		src={imageUrl ?? noNftImage}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: name ?? '' })}
		size={logoSize}
		circle={false}
		{color}
		{ring}
		{testId}
	/>

	{#if nonNullish(badge) && badge?.type === 'network'}
		<div
			class="absolute -bottom-1"
			class:scale-60={logoSize === 'xs'}
			class:-right-1={logoSize !== 'xs'}
			class:-right-1.75={logoSize === 'xs'}
		>
			<NetworkLogo {network} {color} testId={`network-${badgeTestId}`} />
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
