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
		delayOnNetworkSelect?: boolean;
		labelsSize?: LabelSize;
		supportedNetworks?: NetworkType[];
		allNetworksEnabled?: boolean;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let {
		selectedNetworkId,
		delayOnNetworkSelect = true,
		labelsSize = 'md',
		supportedNetworks,
		allNetworksEnabled = true,
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
		{delayOnNetworkSelect}
		{labelsSize}
		{onSelected}
		{selectedNetworkId}
		usdBalance={mainnetTokensUsdBalance}
	/>
{/if}

<ul class="flex list-none flex-col">
	{#each enabledNetworks as network (network.id)}
		<li class="logo-button-list-item" transition:slide={SLIDE_EASING}
			><MainnetNetwork
				{delayOnNetworkSelect}
				{labelsSize}
				{network}
				{onSelected}
				{selectedNetworkId}
			/></li
		>
	{/each}
</ul>

{#if $testnetsEnabled && $networksTestnets.length && isNullish(supportedNetworks)}
	<span class="mb-3 mt-6 flex px-3 font-bold" transition:slide={SLIDE_EASING}
		>{$i18n.networks.test_networks}</span
	>

	<ul class="flex list-none flex-col" transition:slide={SLIDE_EASING}>
		{#each $networksTestnets as network (network.id)}
			<li class="logo-button-list-item" transition:slide={SLIDE_EASING}
				><Network
					{delayOnNetworkSelect}
					{labelsSize}
					{network}
					{onSelected}
					{selectedNetworkId}
				/></li
			>
		{/each}
	</ul>
{/if}
