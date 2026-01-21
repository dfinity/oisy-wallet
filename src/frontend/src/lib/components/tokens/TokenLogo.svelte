<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Component } from 'svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { CardData } from '$lib/types/token-card';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		data: CardData;
		color?: 'off-white' | 'white';
		badge?:
			| { type: 'network' }
			| { type: 'tokenCount'; count: number }
			| { type: 'icon'; icon: Component; ariaLabel: string };
		logoSize?: LogoSize;
		ring?: boolean;
		testId?: string;
		badgeTestId?: string;
	}

	let {
		data,
		color = 'off-white',
		badge,
		logoSize = 'lg',
		ring = false,
		testId,
		badgeTestId
	}: Props = $props();

	let { icon, name, network } = $derived(data);
</script>

<div class="grid">
	<div class="col-start-1 row-start-1">
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
			{color}
			{ring}
			size={logoSize}
			src={icon}
			{testId}
		/>
	</div>

	{#if badge?.type === 'tokenCount' && badge.count > 0}
		<div class="col-start-1 row-start-1 translate-x-1 place-self-end">
			<span
				class="flex h-6 w-6 items-center justify-center rounded-full border-[0.5px] border-tertiary bg-primary text-sm font-semibold text-primary"
				aria-label={replacePlaceholders($i18n.tokens.alt.token_group_number, { $token: name })}
				data-tid={`token-count-${badgeTestId}`}
			>
				{badge.count}
			</span>
		</div>
	{:else if badge?.type === 'network' && nonNullish(network)}
		<div
			class="col-start-1 row-start-1 translate-x-1 place-self-end"
			class:scale-60={logoSize === 'xs'}
			class:translate-x-2={logoSize === 'xs'}
			class:translate-y-1={logoSize === 'xs'}
		>
			<NetworkLogo {color} {network} testId={`network-${badgeTestId}`} />
		</div>
	{:else if badge?.type === 'icon'}
		<div class="col-start-1 row-start-1 translate-x-1 place-self-end">
			<RoundedIcon
				ariaLabel={badge.ariaLabel}
				icon={badge.icon}
				paddingClass="p-1"
				size="12"
				testId="icon-badge"
			/>
		</div>
	{/if}
</div>
