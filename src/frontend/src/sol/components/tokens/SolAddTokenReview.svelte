<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
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
	import type { TokenMetadata } from '$lib/types/token';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { hardenMetadata } from '$lib/utils/metadata.utils';
	import { getTokenInfo } from '$sol/api/solana.api';
	import { splTokens } from '$sol/derived/spl.derived';
	import { getSplMetadata } from '$sol/services/spl.services';
	import type { SplTokenAddress } from '$sol/types/spl';
	import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';

	export let tokenAddress: SplTokenAddress | undefined;
	export let metadata: TokenMetadata | undefined;
	export let network: Network;

	onMount(async () => {
		if (isNullish(tokenAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.import.error.missing_token_address }
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
			$splTokens?.find(({ address }) =>
				areAddressesEqual({ address1: address, address2: tokenAddress, networkId: network.id })
			) !== undefined
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.already_available }
			});

			dispatch('icBack');
			return;
		}

		try {
			const solNetwork = safeMapNetworkIdToNetwork(network.id);

			const { decimals } = await getTokenInfo({ address: tokenAddress, network: solNetwork });

			const splMetadata = await getSplMetadata({ address: tokenAddress, network: solNetwork });

			if (isNullish(splMetadata?.symbol) || isNullish(splMetadata?.name)) {
				toastsError({
					msg: { text: $i18n.tokens.error.incomplete_metadata }
				});

				dispatch('icBack');
				return;
			}

			metadata = { ...hardenMetadata(splMetadata), decimals };

			if (
				$splTokens?.find(
					({ symbol, name }) =>
						symbol.toLowerCase() === (metadata?.symbol.toLowerCase() ?? '') ||
						name.toLowerCase() === (metadata?.name.toLowerCase() ?? '')
				) !== undefined
			) {
				toastsError({
					msg: { text: $i18n.tokens.error.duplicate_metadata }
				});

				dispatch('icBack');
				return;
			}
		} catch (_: unknown) {
			toastsError({ msg: { text: $i18n.tokens.import.error.loading_metadata } });

			dispatch('icBack');
		}
	});

	let invalid = true;
	$: invalid = isNullishOrEmpty(tokenAddress) || isNullish(metadata);

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<Value element="div" ref="contractAddress">
		{#snippet label()}
			{$i18n.tokens.text.token_address}{/snippet}
		{#snippet content()}
			{tokenAddress}
		{/snippet}
	</Value>

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

	<Value element="div" ref="network">
		{#snippet label()}
			{$i18n.tokens.manage.text.network}
		{/snippet}

		{#snippet content()}
			<NetworkWithLogo {network} />
		{/snippet}
	</Value>

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
