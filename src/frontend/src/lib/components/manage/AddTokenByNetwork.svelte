<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import EthAddTokenForm from '$eth/components/tokens/EthAddTokenForm.svelte';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import type { AddTokenData } from '$icp-eth/types/add-token';
	import AddTokenByNetworkDropdown from '$lib/components/manage/AddTokenByNetworkDropdown.svelte';
	import AddTokenByNetworkToolbar from '$lib/components/manage/AddTokenByNetworkToolbar.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networks, networksMainnets } from '$lib/derived/networks.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import SolAddTokenForm from '$sol/components/tokens/SolAddTokenForm.svelte';

	export let network: Network | undefined;
	export let tokenData: Partial<AddTokenData>;

	let networkName: string | undefined = network?.name;
	$: (networkName,
		(network = nonNullish(networkName)
			? $networks.find(({ name }) => name === networkName)
			: undefined));

	let isIcpNetwork = false;
	$: isIcpNetwork = isNetworkIdICP(network?.id);

	let isEthereumNetwork = false;
	$: isEthereumNetwork = isNetworkIdEthereum(network?.id);

	let isEvmNetwork = false;
	$: isEvmNetwork = isNetworkIdEvm(network?.id);

	let isSolanaNetwork = false;
	$: isSolanaNetwork = isNetworkIdSolana(network?.id);

	let { ledgerCanisterId, indexCanisterId, ethContractAddress, splTokenAddress } = tokenData;

	// Since we persist the values of relevant variables when switching networks, this ensures that
	// only the data related to the selected network is passed.
	$: if (isIcpNetwork) {
		tokenData = {
			ledgerCanisterId,
			indexCanisterId:
				nonNullish(indexCanisterId) && notEmptyString(indexCanisterId) ? indexCanisterId : undefined
		};
	} else if (isEthereumNetwork || isEvmNetwork) {
		tokenData = { ethContractAddress };
	} else if (isSolanaNetwork) {
		tokenData = { splTokenAddress };
	} else {
		tokenData = {};
	}

	const dispatch = createEventDispatcher();

	let invalidEth = true;
	$: invalidEth = isNullishOrEmpty(ethContractAddress);

	let invalidIc = true;
	$: invalidIc = isNullishOrEmpty(ledgerCanisterId);

	let invalidSpl = true;
	$: invalidSpl = isNullishOrEmpty(splTokenAddress);

	let invalid = true;
	$: invalid = isIcpNetwork
		? invalidIc
		: isEthereumNetwork || isEvmNetwork
			? invalidEth
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

<form class="min-h-auto" method="POST" on:submit|preventDefault={() => dispatch('icNext')} in:fade>
	<ContentWithToolbar>
		{#if enabledNetworkSelector}
			<AddTokenByNetworkDropdown {availableNetworks} bind:networkName />
		{/if}

		{#if isIcpNetwork}
			<IcAddTokenForm on:icBack bind:ledgerCanisterId bind:indexCanisterId />
		{:else if isEthereumNetwork || isEvmNetwork}
			<EthAddTokenForm on:icBack bind:contractAddress={ethContractAddress} />
		{:else if isSolanaNetwork}
			<SolAddTokenForm bind:tokenAddress={splTokenAddress} />
		{:else if nonNullish($selectedNetwork)}
			<span class="mb-6">{$i18n.tokens.import.text.custom_tokens_not_supported}</span>
		{/if}

		{#snippet toolbar()}
			<AddTokenByNetworkToolbar {invalid} on:icBack />
		{/snippet}
	</ContentWithToolbar>
</form>
