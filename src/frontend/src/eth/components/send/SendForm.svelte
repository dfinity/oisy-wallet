<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher } from 'svelte';
	import FeeDisplay from '$eth/components/fee/FeeDisplay.svelte';
	import { token } from '$lib/derived/token.derived';
	import SendNetworkICP from './SendNetworkICP.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { address } from '$lib/derived/address.derived';
	import type { Network } from '$lib/types/network';
	import SendAmount from '$eth/components/send/SendAmount.svelte';
	import { isNullish } from '@dfinity/utils';
	import SendDestination from '$eth/components/send/SendDestination.svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let network: Network | undefined = undefined;

	let insufficientFunds: boolean;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination || insufficientFunds || isNullishOrEmpty(destination) || isNullish(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<SendDestination bind:destination bind:invalidDestination />

	<SendNetworkICP token={$token} bind:destination bind:network />

	<SendAmount bind:amount bind:insufficientFunds />

	<SendSource token={$token} source={$address ?? ''} />

	<FeeDisplay />

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}>Cancel</button>
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			Next
		</button>
	</div>
</form>
