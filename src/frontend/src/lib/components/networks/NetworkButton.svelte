<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { IconCheck } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { NetworkId } from '$lib/types/network';
	import { networkId } from '$lib/derived/network.derived';
	import { back, isRouteTransactions, switchNetwork } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

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
	<div class="flex gap-2 items-center">
		<Logo
			src={icon}
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: name
			})}
		/>
		<span>{name}</span>
	</div>

	{#if id === $networkId}
		<span in:fade><IconCheck size="20px" /></span>
	{/if}
</button>
