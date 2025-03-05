<script lang="ts">
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import EthAddTokenForm from '$eth/components/tokens/EthAddTokenForm.svelte';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetworkToolbar from '$lib/components/manage/AddTokenByNetworkToolbar.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networks, networksMainnets } from '$lib/derived/networks.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import SolAddTokenForm from '$sol/components/tokens/SolAddTokenForm.svelte';

	export let network: Network | undefined;
	export let tokenData: Partial<AddTokenData>;

	let networkName: string | undefined = network?.name;
	$: networkName,
		(network = nonNullish(networkName)
			? $networks.find(({ name }) => name === networkName)
			: undefined);

	let isIcpNetwork = false;
	$: isIcpNetwork = isNetworkIdICP(network?.id);

	let isEthereumNetwork = false;
	$: isEthereumNetwork = isNetworkIdEthereum(network?.id);

	let isSolanaNetwork = false;
	$: isSolanaNetwork = isNetworkIdSolana(network?.id);

	let ledgerCanisterId = tokenData?.ledgerCanisterId ?? '';
	let indexCanisterId = tokenData?.indexCanisterId ?? '';
	let erc20ContractAddress = tokenData?.erc20ContractAddress ?? '';
	let splTokenAddress = tokenData?.splTokenAddress ?? '';

	// Since we persist the values of relevant variables when switching networks, this ensures that
	// only the data related to the selected network is passed.
	$: {
		if (isIcpNetwork) {
			tokenData = {
				ledgerCanisterId,
				indexCanisterId:
					nonNullish(indexCanisterId) && notEmptyString(indexCanisterId)
						? indexCanisterId
						: undefined
			};
		} else if (isEthereumNetwork) {
			tokenData = { erc20ContractAddress };
		} else if (isSolanaNetwork) {
			tokenData = { splTokenAddress };
		} else {
			tokenData = {};
		}
	}

	const dispatch = createEventDispatcher();

	let invalidErc20 = true;
	$: invalidErc20 = isNullishOrEmpty(erc20ContractAddress);

	let invalidIc = true;
	$: invalidIc = isNullishOrEmpty(ledgerCanisterId);

	let invalidSpl = true;
	$: invalidSpl = isNullishOrEmpty(splTokenAddress);

	let invalid = true;
	$: invalid = isIcpNetwork
		? invalidIc
		: isEthereumNetwork
			? invalidErc20
			: isSolanaNetwork
				? invalidSpl
				: true;

	let enabledNetworkSelector = true;
	$: enabledNetworkSelector = isNullish($selectedNetwork);

	let availableNetworks: Network[] = [];
	// filter out BTC networks - they do not have custom tokens
	$: availableNetworks = (
		$selectedNetwork?.env === 'testnet' ? $networks : $networksMainnets
	).filter(({ id }) => !isNetworkIdBitcoin(id));
</script>

<form on:submit={() => dispatch('icNext')} method="POST" in:fade class="min-h-auto">
	<ContentWithToolbar>
		{#if enabledNetworkSelector}
			<Value ref="network" element="div">
				<svelte:fragment slot="label">{$i18n.tokens.manage.text.network}</svelte:fragment>

				<div id="network" class="network mt-1 pt-0.5">
					<Dropdown name="network" bind:selectedValue={networkName}>
						<option disabled selected value={undefined} class:hidden={nonNullish(networkName)}
							>{$i18n.tokens.manage.placeholder.select_network}</option
						>
						{#each availableNetworks as network}
							<DropdownItem value={network.name}>{network.name}</DropdownItem>
						{/each}
					</Dropdown>
				</div>
			</Value>
		{/if}

		{#if isIcpNetwork}
			<IcAddTokenForm on:icBack bind:ledgerCanisterId bind:indexCanisterId />
		{:else if isEthereumNetwork}
			<EthAddTokenForm on:icBack bind:contractAddress={erc20ContractAddress} />
		{:else if isSolanaNetwork}
			<SolAddTokenForm on:icBack bind:tokenAddress={splTokenAddress} />
		{:else if nonNullish($selectedNetwork)}
			<span class="mb-6">{$i18n.tokens.import.text.custom_tokens_not_supported}</span>
		{/if}

		<AddTokenByNetworkToolbar slot="toolbar" {invalid} on:icBack />
	</ContentWithToolbar>
</form>

<style lang="scss">
	.hidden {
		display: none;
	}

	.network {
		--disable-contrast: rgba(0, 0, 0, 0.5);
	}
</style>
