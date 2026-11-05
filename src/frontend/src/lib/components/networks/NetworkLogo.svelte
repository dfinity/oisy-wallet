<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { COLORED_NETWORK_LOGOS_CONTEXT_KEY } from '$lib/stores/colored-network-logos.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Network } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		network: Network;
		size?: LogoSize;
		color?: 'off-white' | 'white';
		testId?: string;
		transparent?: boolean;
		alwaysInverted?: boolean;
	}

	let {
		network,
		size = 'xxs',
		color = 'off-white',
		testId,
		transparent = false,
		alwaysInverted = false
	}: Props = $props();

	// The brand-coloured mark on a screen that tells networks apart by colour (the swap modal);
	// networks without one keep the monochrome mark.
	const colored = getContext<boolean | undefined>(COLORED_NETWORK_LOGOS_CONTEXT_KEY) ?? false;

	const isPseudoNetwork = $derived(network.id === ICP_PSEUDO_TESTNET_NETWORK_ID);
	const isTestnet = $derived(network.env === 'testnet' && !isPseudoNetwork);

	const { icon, iconColored, name } = $derived(network ?? {});

	const coloredIcon = $derived(colored ? iconColored : undefined);

	const src = $derived(coloredIcon ?? icon);

	// Inverting a coloured mark would turn its brand colours into their complements.
	const invertible = $derived(isNullish(coloredIcon));
</script>

{#if transparent}
	<div
		class="block"
		class:always-inverted={alwaysInverted && invertible}
		class:invert-on-dark-theme={!isTestnet && invertible}
		data-tid={`${testId}-transparent-container`}
	>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
			{color}
			{size}
			{src}
			testId={`${testId}-transparent`}
		/>
	</div>
{:else}
	<div
		style={`max-height: ${logoSizes[size]}`}
		class="rounded-full bg-primary ring ring-disabled"
		data-tid={`${testId}-light-container`}
	>
		<span
			class="inline-flex"
			class:always-inverted={alwaysInverted && invertible}
			class:invert-on-dark-theme={!isTestnet && invertible}
		>
			<Logo
				alt={replacePlaceholders($i18n.core.alt.logo, {
					$name: name
				})}
				{color}
				{size}
				{src}
				testId={`${testId}-default`}
			/>
		</span>
	</div>
{/if}
