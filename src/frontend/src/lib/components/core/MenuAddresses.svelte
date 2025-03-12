<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BtcWalletAddress from '$btc/components/core/BtcWalletAddress.svelte';
	import EthWalletAddress from '$eth/components/core/EthWalletAddress.svelte';
	import IcWalletAddress from '$icp/components/core/IcWalletAddress.svelte';
	import WalletAddresses from '$lib/components/core/WalletAddresses.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		networkBitcoin,
		networkEthereum,
		networkICP,
		networkSolana,
		pseudoNetworkChainFusion
	} from '$lib/derived/network.derived';
	import SolWalletAddress from '$sol/components/core/SolWalletAddress.svelte';

	const dispatch = createEventDispatcher();

	const click = () => dispatch('icMenuClick');
</script>

{#if $networkICP}
	<IcWalletAddress />
{:else if $networkEthereum}
	<EthWalletAddress />
{:else if $networkBitcoin}
	<BtcWalletAddress />
{:else if $networkSolana}
	<SolWalletAddress />
{:else if $pseudoNetworkChainFusion}
	<WalletAddresses on:icReceiveTriggered={click} />
{/if}

<Hr />
