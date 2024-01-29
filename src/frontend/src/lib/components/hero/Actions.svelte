<script lang="ts">
	import Send from '$eth/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import ConvertETHToCkETH from '$icp-eth/components/send/ConvertETHToCkETH.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import IcSend from '$icp/components/send/IcSend.svelte';
	import { ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';

	export let send = false;

	let convertEth = false;
	$: convertEth = send && $ethToCkETHEnabled;

	let singleAction = true;
	$: singleAction = !send && !convertEth;
</script>

<div
	role="toolbar"
	class="flex grid-cols-2 gap-4 text-deep-violet font-bold pt-10 pb-7"
	class:flex={singleAction}
	class:grid={!singleAction}
>
	<Receive />

	{#if send}
		{#if $networkICP}
			<IcSend />
		{:else}
			<Send />
		{/if}
	{/if}

	{#if convertEth}
		<ConvertETHToCkETH />
	{/if}
</div>
