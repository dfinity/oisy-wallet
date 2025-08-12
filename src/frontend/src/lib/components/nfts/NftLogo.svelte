<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component } from 'svelte';
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
		badge?: { type: 'icon'; icon: Component; ariaLabel: string };
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

	const { imageUrl, name } = nft;
</script>

<div class="relative">
	<!-- TODO add fallback logo for nfts -->
	<Logo
		src={imageUrl ?? ''}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
		size={logoSize}
		rounded={false}
		{color}
		{ring}
		{testId}
	/>

	{#if nonNullish(badge) && badge?.type === 'icon'}
		<div
			class="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-brand-tertiary p-1 text-primary-inverted"
			aria-label={badge.ariaLabel}
			data-tid={`icon-${badgeTestId}`}
		>
			<badge.icon size="16" />
		</div>
	{/if}
</div>
