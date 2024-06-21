<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { networks } from '$lib/derived/networks.derived';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import { fade } from 'svelte/transition';
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import { isNetworkIdICP } from '$lib/utils/network.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils.js';

	export let network: Network | undefined;
	export let tokenData: Record<string, string>;

	let networkName: string | undefined = network?.name;
	$: networkName,
		(network = nonNullish(networkName)
			? $networks.find(({ name }) => name === networkName)
			: undefined);

	let ledgerCanisterId: string;
	let indexCanisterId: string;
	let erc20ContractAddress: string;

	// Since we persist the values of relevant variables when switching networks, this ensures that
	// only the data related to the selected network is passed.
	$: {
		if (isNetworkIdICP(network?.id)) {
			tokenData = { ledgerCanisterId, indexCanisterId };
		} else if (isNetworkIdEthereum(network?.id)) {
			tokenData = { erc20ContractAddress };
		} else {
			tokenData = {};
		}
	}
</script>

<div class="stretch pt-8">
	<label for="network" class="font-bold px-4.5">{$i18n.tokens.manage.text.network}:</label>

	<div id="network" class="mb-4 mt-1 pt-0.5">
		<Dropdown name="network" bind:selectedValue={networkName}>
			<option disabled selected value={undefined} class="hidden"
				><span class="description">{$i18n.tokens.manage.placeholder.select_network}</span></option
			>
			{#each $networks as network}
				<DropdownItem value={network.name}>{network.name}</DropdownItem>
			{/each}
		</Dropdown>
	</div>

	{#if nonNullish(network)}
		<div class="mt-8">
			{#if isNetworkIdICP(network?.id)}
				<div in:fade>
					<IcAddTokenForm on:icBack on:icNext bind:ledgerCanisterId bind:indexCanisterId />
				</div>
			{:else if isNetworkIdEthereum(network?.id)}
				<div in:fade>
					<AddTokenForm on:icBack on:icNext bind:contractAddress={erc20ContractAddress} />
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.hidden {
		display: none;
	}
</style>
