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

	export let contractAddress = '';
	export let metadata: Erc20Metadata | undefined;

	onMount(async () => {
		if (
			$erc20TokensStore?.find(
				({ address }) => address.toLowerCase() === contractAddress.toLowerCase()
			)
		) {
			toastsError({
				msg: { text: 'Token is already available.' }
			});

			dispatch('icBack');
			return;
		}

		try {
			const { metadata: metadataApi } = infuraErc20Providers($networkId);
			metadata = await metadataApi({ address: contractAddress });
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Error while loading the ERC20 contract metadata.' },
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
	<svelte:fragment slot="label">Contract address</svelte:fragment>
	{contractAddress}
</Value>

<Value ref="contractName" element="div">
	<svelte:fragment slot="label">Name</svelte:fragment>
	{#if isNullish(metadata)}
		&#8203;
	{:else}
		<span in:fade>{metadata.name}</span>
	{/if}
</Value>

<Value ref="contractSymbol" element="div">
	<svelte:fragment slot="label">Symbol</svelte:fragment>
	{#if isNullish(metadata)}
		&#8203;
	{:else}
		<span in:fade>{metadata.symbol}</span>
	{/if}
</Value>

<Value ref="contractDecimals" element="div">
	<svelte:fragment slot="label">Decimals</svelte:fragment>
	{#if isNullish(metadata)}
		&#8203;
	{:else}
		<span in:fade>{metadata.decimals}</span>
	{/if}
</Value>

<Warning>
	<p>
		Make sure that you trust the token that you are adding. If the token you are adding is
		controlled by a malicious party, they could try and scam you e.g. by making you believe you
		received a significant amount of tokens in order to trick you into sending them tokens in return
		or perform other undesired actions. Learn more about scams and security risks e.g. <a
			rel="noreferrer noopener"
			target="_blank"
			href="https://support.metamask.io/hc/en-us/articles/4403988839451">here</a
		>.
	</p>
</Warning>

<div class="flex justify-end gap-1 mb-2">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSave')}
	>
		Save
	</button>
</div>

<style lang="scss">
	a:active,
	a:hover {
		color: var(--color-off-white);
	}
</style>
