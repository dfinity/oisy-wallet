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
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';

	export let id: NetworkId | undefined;
	export let name: string;
	export let icon: string | undefined;
	export let usdBalance: number | undefined = undefined;
	export let isTestnet: boolean = false;
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

<LogoButton on:click={onClick} selectable selected={id === $networkId} dividers>
	<Logo slot="logo" src={icon} />
	<span slot="title" class="mr-2 font-normal">
		{name}

		<span class="ml-2 inline-flex">
			{#if isTestnet}
				<Badge styleClass="pt-0 pb-0">Testnet</Badge>
			{/if}
		</span>
	</span>

	<span slot="description-end"
		>{nonNullish(usdBalance) ? formatUSD({ value: usdBalance }) : ''}</span
	>
</LogoButton>
