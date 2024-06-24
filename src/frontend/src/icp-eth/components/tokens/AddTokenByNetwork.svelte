<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { networks, networksMainnets } from '$lib/derived/networks.derived';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import { fade } from 'svelte/transition';
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import { isNetworkIdICP, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { createEventDispatcher } from 'svelte';
	import AddTokenByNetworkToolbar from '$icp-eth/components/tokens/AddTokenByNetworkToolbar.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import type { AddTokenData } from '$icp-eth/types/add-token';

	export let network: Network | undefined;
	export let tokenData: Partial<AddTokenData>;

	let networkName: string | undefined = network?.name;
	$: networkName,
		(network = nonNullish(networkName)
			? $networks.find(({ name }) => name === networkName)
			: undefined);

	let ledgerCanisterId = tokenData?.ledgerCanisterId ?? '';
	let indexCanisterId = tokenData?.indexCanisterId ?? '';
	let erc20ContractAddress = tokenData?.contractAddress ?? '';

	// Since we persist the values of relevant variables when switching networks, this ensures that
	// only the data related to the selected network is passed.
	$: {
		if (isNetworkIdICP(network?.id)) {
			tokenData = { ledgerCanisterId, indexCanisterId };
		} else if (isNetworkIdEthereum(network?.id)) {
			tokenData = { contractAddress: erc20ContractAddress };
		} else {
			tokenData = {};
		}
	}

	const dispatch = createEventDispatcher();

	let invalidErc20 = true;
	$: invalidErc20 = isNullishOrEmpty(erc20ContractAddress);

	let invalidIc = true;
	$: invalidIc = isNullishOrEmpty(ledgerCanisterId) || isNullishOrEmpty(indexCanisterId);

	let invalid = true;
	$: invalid = isNetworkIdEthereum(network?.id) ? invalidErc20 : invalidIc;

	let disabledNetworkSelector = false;
	$: disabledNetworkSelector = nonNullish($selectedNetwork);

	let availableNetworks: Network[] = [];
	$: availableNetworks = $selectedNetwork?.env === 'testnet' ? $networks : $networksMainnets;
</script>

<label for="network" class="font-bold px-4.5">{$i18n.tokens.manage.text.network}:</label>

<div id="network" class="mb-6 mt-1 pt-0.5 network" class:opacity-50={disabledNetworkSelector}>
	<Dropdown name="network" bind:selectedValue={networkName} disabled={disabledNetworkSelector}>
		<option disabled selected value={undefined} class="hidden"
			><span class="description">{$i18n.tokens.manage.placeholder.select_network}</span></option
		>
		{#each availableNetworks as network}
			<DropdownItem value={network.name}>{network.name}</DropdownItem>
		{/each}
	</Dropdown>
</div>

<form on:submit={() => dispatch('icNext')} method="POST" in:fade>
	{#if isNetworkIdICP(network?.id)}
		<IcAddTokenForm on:icBack bind:ledgerCanisterId bind:indexCanisterId />
	{:else if isNetworkIdEthereum(network?.id)}
		<AddTokenForm on:icBack bind:contractAddress={erc20ContractAddress} />
	{/if}

	<AddTokenByNetworkToolbar {invalid} on:icBack />
</form>

<style lang="scss">
	.hidden {
		display: none;
	}

	.network {
		--disable-contrast: rgba(0, 0, 0, 0.5);
	}
</style>
