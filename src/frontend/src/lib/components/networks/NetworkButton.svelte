<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { NetworkId } from '$lib/types/network';
	import { networkId } from '$lib/derived/network.derived';
	import { back, isRouteTransactions, switchNetwork } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';

	export let id: NetworkId | undefined;
	export let name: string;
	export let icon: string | undefined;

	const dispatch = createEventDispatcher();

	const onClick = async () => {
		await switchNetwork(id);

		if (isRouteTransactions($page)) {
			await back({ networkId: $networkId });
		}

		// A small delay to give the user a visual feedback that the network is checked
		setTimeout(() => dispatch('icSelected'), 500);
	};
</script>

<button class="w-full flex justify-between items-center" on:click={onClick}>
	<TextWithLogo {name} {icon} logo="start" />

	{#if id === $networkId}
		<span in:fade><IconCheck size="20px" /></span>
	{/if}
</button>
