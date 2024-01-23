<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import ConvertETHToCkETH from '$eth/components/send/SendConvertETH.svelte';

	export let send = false;
	export let convertEth = false;

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
		<Send />
	{/if}

	{#if convertEth}
		<ConvertETHToCkETH />
	{/if}
</div>
