<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { formatUSD } from '$lib/utils/format.utils';

	export let id: NetworkId | undefined;
	export let name: string;
	export let icon: string | undefined;
	export let usdBalance: number | undefined = undefined;
	export let isTestnet = false;
	export let testId: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	const onClick = () => {
		// A small delay to give the user a visual feedback that the network is checked
		setTimeout(() => dispatch('icSelected', id), 500);
	};
</script>

<LogoButton {testId} on:click={onClick} selectable selected={id === $networkId} dividers>
	<Logo slot="logo" src={icon} />

	<span slot="title" class="mr-2 text-sm font-normal md:text-base">
		{name}
	</span>

	<span slot="description-end">
		{#if nonNullish(usdBalance)}
			{formatUSD({ value: usdBalance })}
		{/if}

		{#if isTestnet}
			<span class="inline-flex">
				<Badge styleClass="pt-0 pb-0">{$i18n.networks.testnet}</Badge>
			</span>
		{/if}
	</span>
</LogoButton>
