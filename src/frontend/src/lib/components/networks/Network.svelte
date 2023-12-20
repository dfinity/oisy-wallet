<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { IconCheck } from '@dfinity/gix-components';
	import { networkId } from '$lib/stores/token.store';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Network, NetworkId } from '$lib/types/network';

	export let network: Network;

	const dispatch = createEventDispatcher();

	const onClick = () => {
		networkId.set(id);

		// A small delay to give the user a visual feedback that the network is checked
		setTimeout(() => dispatch('icSelected'), 500);
	};

	let id: NetworkId;
	let name: string;
	let icon: string;
	$: ({ id, name, icon } = network);
</script>

<button class="w-full flex justify-between items-center" on:click={onClick}>
	<div class="flex gap-2 items-center">
		<Logo src={icon} size="20px" alt={`${name} logo`} />
		<span>{name}</span>
	</div>

	{#if id === $networkId}
		<span in:fade><IconCheck size="20px" /></span>
	{/if}
</button>
