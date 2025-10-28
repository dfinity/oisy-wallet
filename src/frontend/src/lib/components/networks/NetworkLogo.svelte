<script lang="ts">
	import { ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
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
	}

	let { network, size = 'xxs', color = 'off-white', testId, transparent = false }: Props = $props();

	const isPseudoNetwork = $derived(network.id === ICP_PSEUDO_TESTNET_NETWORK_ID);
	const isTestnet = $derived(network.env === 'testnet' && !isPseudoNetwork);

	const { icon, name } = $derived(network ?? {});
</script>

{#if transparent}
	<div
		class="block"
		class:invert-on-dark-theme={!isTestnet}
		data-tid={`${testId}-transparent-container`}
	>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
			{color}
			{size}
			src={icon}
			testId={`${testId}-transparent`}
		/>
	</div>
{:else}
	<div
		style={`max-height: ${logoSizes[size]}`}
		class="rounded-full bg-primary ring ring-disabled"
		data-tid={`${testId}-light-container`}
	>
		<span class="inline-flex" class:invert-on-dark-theme={!isTestnet}>
			<Logo
				alt={replacePlaceholders($i18n.core.alt.logo, {
					$name: name
				})}
				{color}
				{size}
				src={icon}
				testId={`${testId}-default`}
			/>
		</span>
	</div>
{/if}
