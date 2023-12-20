<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { IconCheck } from '@dfinity/gix-components';
	import type { Token, TokenNetwork } from '$lib/types/token';
	import { selectedTokenNetwork } from '$lib/stores/token.store';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let token: Required<Token>;

	let icon: string;
	$: ({ icon } = token);

	let network: TokenNetwork;
	let networkName: string;

	onMount(() => {
		network = token.network;

		// TODO: this can be solved with an i18n feature
		switch (network) {
			case 'icp':
				networkName = 'Internet Computer';
				break;
			default:
				networkName = 'Ethereum';
		}
	});

	const dispatch = createEventDispatcher();

	const onClick = () => {
		selectedTokenNetwork.set(network);

		// A small delay to give the user a visual feedback that the network is checked
		setTimeout(() => dispatch('icSelected'), 500);
	};
</script>

<button class="w-full flex justify-between items-center" on:click={onClick}>
	<div class="flex gap-2 items-center">
		<Logo src={icon} size="20px" alt={`${networkName} logo`} />
		<span>{networkName}</span>
	</div>

	{#if network === $selectedTokenNetwork}
		<span in:fade><IconCheck size="20px" /></span>
	{/if}
</button>
