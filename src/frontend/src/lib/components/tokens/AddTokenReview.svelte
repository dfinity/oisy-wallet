<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { metadata as metadataApi } from '$lib/providers/infura-erc20.providers';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Erc20Metadata } from '$lib/types/erc20';
	import { isNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { erc20TokensStore } from '$lib/stores/erc20.store';

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

<label for="contractAddress" class="font-bold px-1.25">Contract address:</label>
<div id="contractAddress" class="font-normal mb-2 px-1.25 break-words">{contractAddress}</div>

<label for="contractName" class="font-bold px-1.25">Name:</label>
<div id="contractName" class="font-normal mb-2 px-1.25 break-words">
	{#if isNullish(metadata)}
		&#8203;
	{:else}
		<span in:fade>{metadata.name}</span>
	{/if}
</div>

<label for="contractSymbol" class="font-bold px-1.25">Symbol:</label>
<div id="contractSymbol" class="font-normal mb-2 px-1.25 break-words">
	{#if isNullish(metadata)}
		&#8203;
	{:else}
		<span in:fade>{metadata.symbol}</span>
	{/if}
</div>

<label for="contractDecimals" class="font-bold px-1.25">Decimals:</label>
<div id="contractDecimals" class="font-normal mb-2 px-1.25 break-words">
	{#if isNullish(metadata)}
		&#8203;
	{:else}
		<span in:fade>{metadata.decimals}</span>
	{/if}
</div>

<Warning>
	<p>Before manually adding a token, make sure you trust it.</p>
</Warning>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-15={invalid}
		on:click={() => dispatch('icSave')}
	>
		Save
	</button>
</div>
