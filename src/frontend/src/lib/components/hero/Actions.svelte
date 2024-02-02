<script lang="ts">
	import Send from '$eth/components/send/Send.svelte';
	import Receive from '$eth/components/receive/Receive.svelte';
	import ConvertETHToCkETH from '$eth/components/send/ConvertETHToCkETH.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import HowToConvertETH from '$icp/components/convert/HowToConvertETH.svelte';
	import {ethToCkETHEnabled} from "$icp-eth/derived/cketh.derived";
	import {PROD} from "$lib/constants/app.constants";

	export let send = false;

	let convertEth = false;
	$: convertEth = send && $ethToCkETHEnabled && !PROD;

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
			<HowToConvertETH />
		{:else}
			<ConvertETHToCkETH />
		{/if}
	{/if}
</div>
