<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import MainnetNetwork from '$lib/components/networks/MainnetNetwork.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LabelSize } from '$lib/types/components';
	import type { NetworkId, Network as NetworkType, OptionNetworkId } from '$lib/types/network';

	interface Props {
		selectedNetworkId?: NetworkId;
		labelsSize?: LabelSize;
		supportedNetworks?: NetworkType[];
		allNetworksEnabled?: boolean;
		showTestnets?: boolean;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let {
		selectedNetworkId,
		labelsSize = 'md',
		supportedNetworks,
		allNetworksEnabled = true,
		showTestnets = true,
		onSelected
	}: Props = $props();

	let enabledNetworks = $derived(supportedNetworks ?? $networksMainnets);

	let mainnetTokensUsdBalance = $derived<number>(
		enabledNetworks.reduce(
			(acc, { id }) => acc + ($enabledMainnetTokensUsdBalancesPerNetwork[id] ?? 0),
			0
		)
	);
</script>

{#if allNetworksEnabled}
	<NetworkButton
		{labelsSize}
		{onSelected}
		{selectedNetworkId}
		usdBalance={mainnetTokensUsdBalance}
	/>
{/if}

<ul class="flex list-none flex-col">
	{#each enabledNetworks as network (network.id)}
		<li class="logo-button-list-item" transition:slide={SLIDE_EASING}
			><MainnetNetwork {labelsSize} {network} {onSelected} {selectedNetworkId} /></li
		>
	{/each}
</ul>

{#if showTestnets && $testnetsEnabled && $networksTestnets.length && isNullish(supportedNetworks)}
	<span class="mt-6 mb-3 flex px-3 font-bold" transition:slide={SLIDE_EASING}
		>{$i18n.networks.test_networks}</span
	>

	<ul class="flex list-none flex-col" transition:slide={SLIDE_EASING}>
		{#each $networksTestnets as network (network.id)}
			<li class="logo-button-list-item" transition:slide={SLIDE_EASING}
				><Network {labelsSize} {network} {onSelected} {selectedNetworkId} /></li
			>
		{/each}
	</ul>
{/if}
