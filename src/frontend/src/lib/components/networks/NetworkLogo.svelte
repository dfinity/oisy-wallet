<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Network } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { logoSizes } from '$lib/constants/components.constants';
	import { ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';

	interface Props {
		network: Network;
		size?: LogoSize;
		color?: 'off-white' | 'white';
		testId?: string;
		transparent?: boolean;
	}

	let { network, size = 'xxs', color = 'off-white', testId, transparent = false }: Props = $props();

	const isPseudoNetwork = $derived(network.id === ICP_PSEUDO_TESTNET_NETWORK_ID);
	const isTestnet = $derived(network.env === 'testnet' && !isPseudoNetwork);
</script>

{#if transparent && nonNullish(network.iconTransparent)}
	<div class="block" data-tid={`${testId}-transparent-container`}>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: network.name })}
			{color}
			{size}
			src={network.iconTransparent}
			testId={`${testId}-transparent`}
		/>
	</div>
{:else}
	<div
		class="rounded-full"
		class:bg-primary={!isTestnet}
		class:bg-disabled={isTestnet}
		data-tid={`${testId}-light-container`}
		style={`max-height: ${logoSizes[size]}`}
	>
		<span
			class="inline-flex"
			class:invert-on-dark-theme={!isTestnet}
			class:brightness-90={isTestnet}
		>
			<Logo
				alt={replacePlaceholders($i18n.core.alt.logo, {
					$name: network.name
				})}
				{color}
				{size}
				src={network.iconTransparent}
				testId={`${testId}-default`}
			/>
		</span>
	</div>
{/if}
