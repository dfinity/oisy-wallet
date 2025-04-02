<script lang="ts">
	import { slide } from 'svelte/transition';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import MainnetNetwork from '$lib/components/networks/MainnetNetwork.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';

	export let selectedNetworkId: NetworkId | undefined = undefined;
	export let delayOnNetworkSelect = true;

	let mainnetTokensUsdBalance: number;
	$: mainnetTokensUsdBalance = $networksMainnets.reduce(
		(acc, { id }) => acc + ($enabledMainnetTokensUsdBalancesPerNetwork[id] ?? 0),
		0
	);
</script>

<NetworkButton
	id={undefined}
	name={$i18n.networks.chain_fusion}
	icon={chainFusion}
	usdBalance={mainnetTokensUsdBalance}
	{selectedNetworkId}
	{delayOnNetworkSelect}
	on:icSelected
/>

<ul class="flex list-none flex-col">
	{#each $networksMainnets as network (network.id)}
		<li class="logo-button-list-item" transition:slide={SLIDE_EASING}
			><MainnetNetwork {network} {selectedNetworkId} {delayOnNetworkSelect} on:icSelected /></li
		>
	{/each}
</ul>

{#if $testnetsEnabled && $networksTestnets.length}
	<span class="mb-3 mt-6 flex px-3 font-bold" transition:slide={SLIDE_EASING}
		>{$i18n.networks.test_networks}</span
	>

	<ul class="flex list-none flex-col" transition:slide={SLIDE_EASING}>
		{#each $networksTestnets as network (network.id)}
			<li class="logo-button-list-item" transition:slide={SLIDE_EASING}
				><Network {network} {selectedNetworkId} {delayOnNetworkSelect} on:icSelected /></li
			>
		{/each}
	</ul>
{/if}
