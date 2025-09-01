<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { erc1155Tokens } from '$eth/derived/erc1155.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { erc721Tokens } from '$eth/derived/erc721.derived';
	import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
	import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
	import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
	import type { Erc1155Metadata } from '$eth/types/erc1155';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import type { Erc721Metadata } from '$eth/types/erc721';
	import type { EthereumNetwork } from '$eth/types/network';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import AddTokenWarning from '$lib/components/tokens/AddTokenWarning.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Network } from '$lib/types/network';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let contractAddress: string | undefined;
	export let metadata: Erc20Metadata | Erc721Metadata | Erc1155Metadata | undefined;
	export let network: Network;

	const validateMetadata = () => {
		if (isNullish(metadata?.symbol) || isNullish(metadata?.name)) {
			toastsError({
				msg: { text: $i18n.tokens.error.incomplete_metadata }
			});
			dispatch('icBack');
			return;
		}

		if (
			[...$erc20Tokens, ...$erc721Tokens]?.find(
				({ symbol, name, network: tokenNetwork }) =>
					(symbol.toLowerCase() === (metadata?.symbol?.toLowerCase() ?? '') ||
						name.toLowerCase() === (metadata?.name?.toLowerCase() ?? '')) &&
					tokenNetwork.chainId === (network as EthereumNetwork).chainId
			) !== undefined
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.duplicate_metadata }
			});

			dispatch('icBack');
			return;
		}
	};

	onMount(async () => {
		if (isNullish(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.import.error.missing_contract_address }
			});

			dispatch('icBack');
			return;
		}

		if (isNullish(network)) {
			toastsError({
				msg: { text: $i18n.tokens.import.error.no_network }
			});

			dispatch('icBack');
			return;
		}

		if (
			[...$erc20Tokens, ...$erc721Tokens, ...$erc1155Tokens]?.find(
				({ address, network: tokenNetwork }) =>
					areAddressesEqual({
						address1: address,
						address2: contractAddress,
						networkId: network.id
					}) && tokenNetwork.chainId === (network as EthereumNetwork).chainId
			) !== undefined
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.already_available }
			});

			dispatch('icBack');
			return;
		}

		const { metadata: metadataApiErc20, isErc20 } = infuraErc20Providers(network.id);
		try {
			if (await isErc20({ contractAddress })) {
				metadata = await metadataApiErc20({ address: contractAddress });
				validateMetadata();
			} else {
				const { metadata: metadataApiErc721, isInterfaceErc721 } = infuraErc721Providers(
					network.id
				);
				if (await isInterfaceErc721({ address: contractAddress })) {
					metadata = await metadataApiErc721({ address: contractAddress });
					validateMetadata();
				} else {
					const { metadata: metadataApiErc1155 } = infuraErc1155Providers(network.id);
					metadata = await metadataApiErc1155({ address: contractAddress });
				}
			}
		} catch (_: unknown) {
			toastsError({ msg: { text: $i18n.tokens.import.error.loading_metadata } });

			dispatch('icBack');
		}
	});

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress) || isNullish(metadata);

	const dispatch = createEventDispatcher();
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
			<ButtonBack onclick={() => dispatch('icBack')} />
			<Button disabled={invalid} onclick={() => dispatch('icSave')}>
				{$i18n.tokens.import.text.add_the_token}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
