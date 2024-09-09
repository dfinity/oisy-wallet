<script lang="ts">
	import EthReceive from '$eth/components/receive/EthReceive.svelte';
	import ConvertToCkERC20 from '$eth/components/send/ConvertToCkERC20.svelte';
	import ConvertToCkETH from '$eth/components/send/ConvertToCkETH.svelte';
	import EthSend from '$eth/components/send/EthSend.svelte';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import ConvertToBTC from '$icp/components/convert/ConvertToBTC.svelte';
	import ConvertToEthereum from '$icp/components/convert/ConvertToEthereum.svelte';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { erc20ToCkErc20Enabled, ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import Send from '$lib/components/send/Send.svelte';
	import {
		networkEthereum,
		networkICP,
		pseudoNetworkChainFusion
	} from '$lib/derived/network.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';

	export let more = false;

	let convertEth = false;
	$: convertEth = $ethToCkETHEnabled && $erc20UserTokensInitialized;

	let convertErc20 = false;
	$: convertErc20 = $erc20ToCkErc20Enabled && $erc20UserTokensInitialized;

	let convertBtc = false;
	$: convertBtc = $tokenCkBtcLedger && $erc20UserTokensInitialized;
</script>

<div role="toolbar" class="flex w-full gap-6 justify-center pt-10 pb-3 px-1 max-w-96">
	{#if $networkICP}
		<IcReceive token={$tokenWithFallback} />
	{:else if $networkEthereum}
		<EthReceive />
	{:else if $pseudoNetworkChainFusion}
		<Receive />
	{/if}

	{#if $networkICP}
		<IcSend token={$tokenWithFallback} />
	{:else if $networkEthereum}
		<EthSend token={$tokenWithFallback} />
	{:else if $pseudoNetworkChainFusion}
		<Send />
	{/if}

	{#if convertEth}
		{#if $networkICP}
			<ConvertToEthereum />
		{:else}
			<ConvertToCkETH />
		{/if}
	{/if}

	{#if convertErc20}
		{#if $networkICP}
			<ConvertToEthereum />
		{:else}
			<ConvertToCkERC20 />
		{/if}
	{/if}

	{#if convertBtc}
		<ConvertToBTC />
	{/if}

	{#if more}
		<ContextMenu />
	{/if}
</div>
