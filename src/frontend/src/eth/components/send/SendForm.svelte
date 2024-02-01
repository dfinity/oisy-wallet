<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import SendNetworkICP from './SendNetworkICP.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { address } from '$lib/derived/address.derived';
	import type { Network } from '$lib/types/network';
	import SendAmount from '$eth/components/send/SendAmount.svelte';
	import { isNullish } from '@dfinity/utils';
	import SendDestination from '$eth/components/send/SendDestination.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let destinationEditable = true;
	export let amount: number | undefined = undefined;

	let insufficientFunds: boolean;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination || insufficientFunds || isNullishOrEmpty(destination) || isNullish(amount);

	const dispatch = createEventDispatcher();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	{#if destinationEditable}
		<SendDestination bind:destination bind:invalidDestination />

		<SendNetworkICP {destination} bind:network />
	{/if}

	<SendAmount bind:amount bind:insufficientFunds />

	<SendSource token={$sendToken} source={$address ?? ''} />

	<FeeDisplay />

	<div class="flex justify-end gap-1">
		<slot name="cancel" />
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			Next
		</button>
	</div>
</form>
