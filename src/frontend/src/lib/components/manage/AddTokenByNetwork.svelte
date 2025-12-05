<script lang="ts">
	import { preventDefault } from '@dfinity/gix-components';
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import EthAddTokenForm from '$eth/components/tokens/EthAddTokenForm.svelte';
	import IcAddExtTokenForm from '$icp/components/tokens/IcAddExtTokenForm.svelte';
	import IcAddIcrcTokenForm from '$icp/components/tokens/IcAddIcrcTokenForm.svelte';
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

	interface Props {
		network?: Network;
		tokenData: Partial<AddTokenData>;
		onBack: () => void;
		onNext: () => void;
		isNftsPage?: boolean;
	}

	let {
		network = $bindable(),
		tokenData = $bindable(),
		onBack,
		onNext,
		isNftsPage = false
	}: Props = $props();

	let networkName = $state<string | undefined>(network?.name);

	$effect(() => {
		network = nonNullish(networkName)
			? $networks.find(({ name }) => name === networkName)
			: undefined;
	});

	let isIcpNetwork = $derived(isNetworkIdICP(network?.id));

	let isEthereumNetwork = $derived(isNetworkIdEthereum(network?.id));

	let isEvmNetwork = $derived(isNetworkIdEvm(network?.id));

	let isSolanaNetwork = $derived(isNetworkIdSolana(network?.id));

	let { ledgerCanisterId, indexCanisterId, extCanisterId, ethContractAddress, splTokenAddress } =
		$derived(tokenData);

	$effect(() => {
		// Since we persist the values of relevant variables when switching networks, this ensures that
		// only the data related to the selected network is passed.
		if (isIcpNetwork) {
			tokenData = isNftsPage
				? { extCanisterId }
				: {
						ledgerCanisterId,
						indexCanisterId:
							nonNullish(indexCanisterId) && notEmptyString(indexCanisterId)
								? indexCanisterId
								: undefined
					};
		} else if (isEthereumNetwork || isEvmNetwork) {
			tokenData = { ethContractAddress };
		} else if (isSolanaNetwork) {
			tokenData = { splTokenAddress };
		} else {
			tokenData = {};
		}
	});

	let invalidEth = $derived(isNullishOrEmpty(ethContractAddress));

	let invalidIc = $derived(isNullishOrEmpty(ledgerCanisterId));

	let invalidExt = $derived(isNullishOrEmpty(extCanisterId));

	let invalidSpl = $derived(isNullishOrEmpty(splTokenAddress));

	let invalid = $derived(
		isIcpNetwork
			? isNftsPage
				? invalidExt
				: invalidIc
			: isEthereumNetwork || isEvmNetwork
				? invalidEth
				: isSolanaNetwork
					? invalidSpl
					: true
	);

	let enabledNetworkSelector = $derived(isNullish($selectedNetwork));

	// filter out BTC networks - they do not have custom tokens
	let availableNetworks = $derived(
		($selectedNetwork?.env === 'testnet' ? $networks : $networksMainnets).filter(
			({ id, supportsNft }) => !isNetworkIdBitcoin(id) && (!isNftsPage || supportsNft)
		)
	);
</script>

<form class="min-h-auto" method="POST" onsubmit={preventDefault(onNext)} in:fade>
	<ContentWithToolbar>
		{#if enabledNetworkSelector}
			<AddTokenByNetworkDropdown {availableNetworks} bind:networkName />
		{/if}

		{#if isIcpNetwork}
			{#if isNftsPage}
				<IcAddExtTokenForm bind:extCanisterId />
			{:else}
				<IcAddIcrcTokenForm bind:ledgerCanisterId bind:indexCanisterId />
			{/if}
		{:else if isEthereumNetwork || isEvmNetwork}
			<EthAddTokenForm bind:contractAddress={ethContractAddress} />
		{:else if isSolanaNetwork}
			<SolAddTokenForm bind:tokenAddress={splTokenAddress} />
		{:else if nonNullish($selectedNetwork)}
			<span class="mb-6">{$i18n.tokens.import.text.custom_tokens_not_supported}</span>
		{/if}

		{#snippet toolbar()}
			<AddTokenByNetworkToolbar {invalid} {onBack} />
		{/snippet}
	</ContentWithToolbar>
</form>
