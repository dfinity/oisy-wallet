<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { NetworkId } from '$lib/types/network';
	import { networkId } from '$lib/derived/network.derived';
	import { gotoReplaceRoot, isRouteTransactions, switchNetwork } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';

	export let id: NetworkId | undefined;
	export let name: string;
	export let icon: string | undefined;
	export let description: string | undefined = undefined;

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

<button class="w-full flex justify-between" on:click={onClick}>
	<TextWithLogo {name} {description} {icon} logo="start" />

	{#if id === $networkId}
		<span in:fade><IconCheck size="20px" /></span>
	{/if}
</button>
