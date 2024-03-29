<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import { isNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import Value from '$lib/components/ui/Value.svelte';
	import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { Html } from '@dfinity/gix-components';

	export let contractAddress = '';
	export let metadata: Erc20Metadata | undefined;

	onMount(async () => {
		if (
			$erc20TokensStore?.find(
				({ address }) => address.toLowerCase() === contractAddress.toLowerCase()
			)
		) {
			toastsError({
				msg: { text: $i18n.tokens.error.already_available }
			});

			dispatch('icBack');
			return;
		}

		try {
			const { metadata: metadataApi } = infuraErc20Providers($networkId);
			metadata = await metadataApi({ address: contractAddress });
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

<Warning>
	<p>
		<Html text={$i18n.tokens.warning.trust_token} />
	</p>
</Warning>

<div class="flex justify-end gap-1 mb-2">
	<button class="secondary" on:click={() => dispatch('icBack')}>{$i18n.core.text.back}</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSave')}
	>
		{$i18n.core.text.save}
	</button>
</div>

<style lang="scss">
	p {
		:global(a) {
			&:active,
			&:hover {
				color: var(--color-off-white);
			}
		}
	}
</style>
