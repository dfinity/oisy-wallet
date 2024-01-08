<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher } from 'svelte';
	import FeeDisplay from '../fee/FeeDisplay.svelte';
	import { token } from '$lib/derived/token.derived';
	import SendNetworkICP from './SendNetworkICP.svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { address } from '$lib/derived/address.derived';
	import type { Network } from '$lib/types/network';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let network: Network | undefined = undefined;

	let invalid = true;
	$: invalid = isNullishOrEmpty(destination) || invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<SendDestination bind:destination {network} />

	<SendNetworkICP token={$token} bind:destination bind:network />

	<label for="amount" class="font-bold px-4.5">Amount:</label>
	<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

	<SendSource token={$token} source={$address ?? ''} />

	<FeeDisplay />

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}>Cancel</button>
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			Next
		</button>
	</div>
</form>
