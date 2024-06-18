<script lang="ts">
	import Send from '$eth/components/send/Send.svelte';
	import Receive from '$eth/components/receive/Receive.svelte';
	import ConvertToCkETH from '$eth/components/send/ConvertToCkETH.svelte';
	import ConvertToCkERC20 from '$eth/components/send/ConvertToCkERC20.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import ConvertToEthereum from '$icp/components/convert/ConvertToEthereum.svelte';
	import { erc20ToCkErc20Enabled, ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import ConvertToBTC from '$icp/components/convert/ConvertToBTC.svelte';
	import { erc20TokensInitialized } from '$eth/derived/erc20.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';

	export let send = false;

	let convertEth = false;
	$: convertEth = send && $ethToCkETHEnabled && $erc20TokensInitialized;

	let convertErc20 = false;
	$: convertErc20 = send && $erc20ToCkErc20Enabled && $erc20TokensInitialized;

	let convertBtc = false;
	$: convertBtc = send && $tokenCkBtcLedger && $erc20TokensInitialized;

	let singleAction = true;
	$: singleAction = !send && !convertEth && !convertErc20;
</script>

<div
	role="toolbar"
	class="flex grid-cols-2 gap-4 text-deep-violet font-bold pt-10 pb-7"
	class:flex={singleAction}
	class:grid={!singleAction}
>
	{#if $networkICP}
		<IcReceive token={$tokenWithFallback} />
	{:else}
		<Receive />
	{/if}

	{#if send}
		{#if $networkICP}
			<IcSend token={$tokenWithFallback} />
		{:else}
			<Send token={$tokenWithFallback} />
		{/if}
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
</div>
