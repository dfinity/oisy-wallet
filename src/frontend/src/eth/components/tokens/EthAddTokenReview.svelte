<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
	import type { Erc20Metadata } from '$eth/types/erc20';
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
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let contractAddress: string | undefined;
	export let metadata: Erc20Metadata | undefined;
	export let network: Network;

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
			$erc20Tokens?.find(
				({ address }) => address.toLowerCase() === contractAddress?.toLowerCase()
			) !== undefined
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.already_available }
			});

			dispatch('icBack');
			return;
		}

		try {
			const { metadata: metadataApi } = infuraErc20Providers(network.id);
			metadata = await metadataApi({ address: contractAddress });

			if (isNullish(metadata?.symbol) || isNullish(metadata?.name)) {
				toastsError({
					msg: { text: $i18n.tokens.error.incomplete_metadata }
				});

				dispatch('icBack');
				return;
			}

			if (
				$erc20Tokens?.find(
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
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.loading_metadata },
				err
			});

			dispatch('icBack');
		}
	});

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress) || isNullish(metadata);

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<Value ref="contractAddress" element="div">
		<svelte:fragment slot="label">{$i18n.tokens.text.contract_address}</svelte:fragment>
		{contractAddress}
	</Value>

	<Value ref="contractName" element="div">
		<svelte:fragment slot="label">{$i18n.core.text.name}</svelte:fragment>
		{#if isNullish(metadata)}
			&#8203;
		{:else}
			<span in:fade>{metadata.name}</span>
		{/if}
	</Value>

	<Value ref="network" element="div">
		<svelte:fragment slot="label">{$i18n.tokens.manage.text.network}</svelte:fragment>
		<NetworkWithLogo {network} />
	</Value>

	<Value ref="contractSymbol" element="div">
		<svelte:fragment slot="label">{$i18n.core.text.symbol}</svelte:fragment>
		{#if isNullish(metadata)}
			&#8203;
		{:else}
			<span in:fade>{metadata.symbol}</span>
		{/if}
	</Value>

	<Value ref="contractDecimals" element="div">
		<svelte:fragment slot="label">{$i18n.core.text.decimals}</svelte:fragment>
		{#if isNullish(metadata)}
			&#8203;
		{:else}
			<span in:fade>{metadata.decimals}</span>
		{/if}
	</Value>

	<AddTokenWarning />

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={() => dispatch('icBack')} />
		<Button disabled={invalid} on:click={() => dispatch('icSave')}>
			{$i18n.tokens.import.text.add_the_token}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
