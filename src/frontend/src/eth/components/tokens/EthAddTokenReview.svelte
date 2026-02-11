<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { erc1155Tokens } from '$eth/derived/erc1155.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
	import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
	import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
	import type { ContractAddress } from '$eth/types/address';
	import type { Erc1155Metadata } from '$eth/types/erc1155';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { Erc721Metadata } from '$eth/types/erc721';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { assertIsNetworkEthereum } from '$lib/utils/network.utils';

	interface Props {
		contractAddress?: string;
		metadata?: Erc20Metadata | Erc721Metadata | Erc1155Metadata;
		network: Network;
		onBack: () => void;
		onSave: () => void;
	}

	let { contractAddress, metadata = $bindable(), network, onBack, onSave }: Props = $props();

	const validateMetadata = () => {
		if (isNullish(metadata?.symbol) || isNullish(metadata?.name)) {
			toastsError({
				msg: { text: $i18n.tokens.error.incomplete_metadata }
			});

			onBack();

			return;
		}

		// This does not happen at this point, but it is useful type-wise
		assertIsNetworkEthereum(network);

		if (
			nonNullish(
				[...$erc20Tokens, ...$erc721Tokens]?.find(
					({ symbol, network: tokenNetwork }) =>
						symbol.toLowerCase() === (metadata?.symbol?.toLowerCase() ?? '') &&
						tokenNetwork.chainId === network.chainId
				)
			)
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.duplicate_metadata }
			});

			onBack();
		}
	};

	const getErcMetadata = async ({
		networkId,
		address
	}: {
		networkId: NetworkId;
		address: ContractAddress['address'];
	}): Promise<Erc20Metadata | Erc721Metadata | Erc1155Metadata | undefined> => {
		const { metadata: metadataApiErc20, isErc20 } = infuraErc20Providers(networkId);

		if (await isErc20({ contractAddress: address })) {
			return await metadataApiErc20({ address });
		}

		const { metadata: metadataApiErc721, isInterfaceErc721 } = infuraErc721Providers(networkId);

		if (await isInterfaceErc721({ address })) {
			return await metadataApiErc721({ address });
		}

		const { metadata: metadataApiErc1155, isInterfaceErc1155 } = infuraErc1155Providers(networkId);

		if (await isInterfaceErc1155({ address })) {
			return await metadataApiErc1155({ address });
		}
	};

	onMount(async () => {
		if (isNullish(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.import.error.missing_contract_address }
			});

			onBack();

			return;
		}

		if (isNullish(network)) {
			toastsError({
				msg: { text: $i18n.tokens.import.error.no_network }
			});

			onBack();

			return;
		}

		// This does not happen at this point, but it is useful type-wise
		assertIsNetworkEthereum(network);

		if (
			[...$erc20Tokens, ...$erc721Tokens, ...$erc1155Tokens]?.find(
				({ address, network: tokenNetwork }) =>
					areAddressesEqual({
						address1: address,
						address2: contractAddress,
						networkId: network.id
					}) && tokenNetwork.chainId === network.chainId
			) !== undefined
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.already_available }
			});

			onBack();

			return;
		}

		try {
			metadata = await getErcMetadata({ networkId: network.id, address: contractAddress });

			validateMetadata();
		} catch (_: unknown) {
			toastsError({ msg: { text: $i18n.tokens.import.error.loading_metadata } });

			onBack();
		}
	});

	let invalid = $derived(isNullishOrEmpty(contractAddress) || isNullish(metadata));
</script>

<ContentWithToolbar>
	<Value element="div" ref="contractAddress">
		{#snippet label()}{$i18n.tokens.text.contract_address}{/snippet}
		{#snippet content()}{contractAddress}{/snippet}
	</Value>

	{#if nonNullish(metadata) && nonNullish(metadata.name)}
		<Value element="div" ref="contractName">
			{#snippet label()}
				{$i18n.core.text.name}
			{/snippet}
			{#snippet content()}
				{#if isNullish(metadata)}
					&#8203;
				{:else}
					<span in:fade>{metadata.name}</span>
				{/if}
			{/snippet}
		</Value>
	{/if}

	<Value element="div" ref="network">
		{#snippet label()}
			{$i18n.tokens.manage.text.network}
		{/snippet}
		{#snippet content()}
			<NetworkWithLogo {network} />
		{/snippet}
	</Value>

	{#if nonNullish(metadata) && nonNullish(metadata.symbol)}
		<Value element="div" ref="contractSymbol">
			{#snippet label()}
				{$i18n.core.text.symbol}
			{/snippet}
			{#snippet content()}
				{#if isNullish(metadata)}
					&#8203;
				{:else}
					<span in:fade>{metadata.symbol}</span>
				{/if}
			{/snippet}
		</Value>
	{/if}

	{#if nonNullish(metadata) && metadata.decimals > 0}
		<Value element="div" ref="contractDecimals">
			{#snippet label()}
				{$i18n.core.text.decimals}
			{/snippet}
			{#snippet content()}
				{#if isNullish(metadata)}
					&#8203;
				{:else}
					<span in:fade>{metadata.decimals}</span>
				{/if}
			{/snippet}
		</Value>
	{/if}

	<AddTokenWarning />

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />
			<Button disabled={invalid} onclick={onSave}>
				{$i18n.tokens.import.text.add_the_token}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
