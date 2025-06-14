<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component } from 'svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { CardData } from '$lib/types/token-card';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let data: CardData;
	export let color: 'off-white' | 'white' = 'off-white';
	export let badge:
		| { type: 'network' }
		| { type: 'tokenCount'; count: number }
		| { type: 'icon'; icon: Component; ariaLabel: string }
		| undefined = undefined;
	export let logoSize: LogoSize = 'lg';
	export let ring = false;
	export let testId: string | undefined = undefined;
	export let badgeTestId: string | undefined = undefined;

	let icon: CardData['icon'];
	let name: CardData['name'];
	let network: CardData['network'];

	$: ({ icon, name, network } = data);
</script>

<div class="relative">
	<Logo
		src={icon}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
		size={logoSize}
		{color}
		{ring}
		{testId}
	/>
	{#if badge?.type === 'tokenCount' && badge.count > 0}
		<span
			class="absolute -right-1 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-[0.5px] border-tertiary bg-primary text-sm font-semibold text-primary"
			aria-label={replacePlaceholders($i18n.tokens.alt.token_group_number, { $token: name })}
			data-tid={`token-count-${badgeTestId}`}
		>
			{badge.count}
		</span>
	{:else if badge?.type === 'network' && nonNullish(network)}
		<div
			class="absolute"
			class:scale-60={logoSize === 'xs'}
			class:-right-1={logoSize !== 'xs'}
			class:-right-1.75={logoSize === 'xs'}
			class:bottom-0={logoSize !== 'xs'}
			class:-bottom-1={logoSize === 'xs'}
		>
			<NetworkLogo {network} {color} testId={`network-${badgeTestId}`} />
		</div>
	{:else if badge?.type === 'icon'}
		<!-- TODO: use new mapping color when merged -->
		<div
			class="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-brand-tertiary p-1 text-primary-inverted"
			aria-label={badge.ariaLabel}
			data-tid={`icon-${badgeTestId}`}
		>
			<svelte:component this={badge.icon} size="16" />
		</div>
	{/if}
</div>
