<script lang="ts">
	import Send from '$eth/components/send/Send.svelte';
	import Receive from '$eth/components/receive/Receive.svelte';
	import ConvertToCkETH from '$eth/components/send/ConvertToCkETH.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import ConvertToETH from '$icp/components/convert/ConvertToETH.svelte';
	import { ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { PROD } from '$lib/constants/app.constants';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import ConvertToBTC from '$icp/components/convert/ConvertToBTC.svelte';

	export let send = false;

	let convertEth = false;
	$: convertEth = send && $ethToCkETHEnabled && !PROD;

	let convertBtc = false;
	$: convertBtc = send && $tokenCkBtcLedger && !PROD;

	let singleAction = true;
	$: singleAction = !send && !convertEth;
</script>

<div
	role="toolbar"
	class="flex grid-cols-2 gap-4 text-deep-violet font-bold pt-10 pb-7"
	class:flex={singleAction}
	class:grid={!singleAction}
>
	{#if $networkICP}
		<IcReceive />
	{:else}
		<Receive />
	{/if}

	{#if send}
		{#if $networkICP}
			<IcSend />
		{:else}
			<Send />
		{/if}
	{/if}

	{#if convertEth}
		{#if $networkICP}
			<ConvertToETH />
		{:else}
			<ConvertToCkETH />
		{/if}
	{/if}

	{#if convertBtc}
		<ConvertToBTC />
	{/if}
</div>
