<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { networksMainnets } from '$lib/derived/networks.derived';
	import { ETHEREUM_NETWORK_ID, ICP_NETWORK_ID } from '$env/networks.env';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import { fade } from 'svelte/transition';
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';

	export let network: Network | undefined;
	export let tokenData: Record<string, string>;

	let networkName: string | undefined = network?.name;
	$: networkName,
		(network = nonNullish(networkName)
			? $networksMainnets.find(({ name }) => name === networkName)
			: undefined);

	let ledgerCanisterId: string;
	let indexCanisterId: string;
	let contractAddress: string;

	$: tokenData = {
		ledgerCanisterId,
		indexCanisterId,
		contractAddress
	};
</script>

<div class="stretch pt-8">
	<label for="network" class="font-bold px-4.5">{$i18n.tokens.manage.text.network}:</label>

	<div id="network" class="mb-4 mt-1 pt-0.5">
		<Dropdown name="network" bind:selectedValue={networkName}>
			<option disabled selected value={undefined} class="hidden"
				><span class="description">{$i18n.tokens.manage.placeholder.select_network}</span></option
			>
			{#each $networksMainnets as network}
				<DropdownItem value={network.name}>{network.name}</DropdownItem>
			{/each}
		</Dropdown>
	</div>

	<div class="mt-8">
		{#if network?.id === ICP_NETWORK_ID}
			<div in:fade>
				<IcAddTokenForm on:icBack on:icNext bind:ledgerCanisterId bind:indexCanisterId />
			</div>
		{:else if network?.id === ETHEREUM_NETWORK_ID}
			<div in:fade>
				<AddTokenForm on:icBack on:icNext bind:contractAddress />
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.hidden {
		display: none;
	}
</style>
