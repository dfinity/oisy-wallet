<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import type { NetworkId } from '$lib/types/network';
	import { formatUSD } from '$lib/utils/format.utils';
	import { gotoReplaceRoot, isRouteTransactions, switchNetwork } from '$lib/utils/nav.utils';

	export let id: NetworkId | undefined;
	export let name: string;
	export let icon: string | undefined;
	export let usdBalance: number | undefined = undefined;
	export let testId: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	const onClick = async () => {
		await switchNetwork(id);

		if (isRouteTransactions($page)) {
			await gotoReplaceRoot();
		}

		// A small delay to give the user a visual feedback that the network is checked
		setTimeout(() => dispatch('icSelected'), 500);
	};
</script>

<button
	data-tid={testId}
	class="dropdown-item flex w-full items-start justify-between"
	class:selected={id === $networkId}
	on:click={onClick}
>
	<TextWithLogo
		{name}
		{icon}
		logo="start"
		description={nonNullish(usdBalance) ? formatUSD({ value: usdBalance }) : undefined}
	/>

	{#if id === $networkId}
		<span in:fade><IconCheck size="20px" /></span>
	{/if}
</button>
