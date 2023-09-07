<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { invalidDestination, invalidAmount } from '$lib/utils/send.utils';
	import { createEventDispatcher } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<label for="destination" class="font-bold px-1.25">Destination:</label>
	<Input
		name="destination"
		inputType="text"
		required
		bind:value={destination}
		placeholder="Enter public address (0x)"
	/>

	<label for="amount" class="font-bold px-1.25">Amount:</label>
	<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

	<SendSource />

	<FeeDisplay />

	<div class="flex justify-end gap-1">
		<button type="button" class="primary" on:click={() => dispatch('icClose')}>Cancel</button>
		<button class="primary" type="submit" disabled={invalid} class:opacity-15={invalid}>
			Next
		</button>
	</div>
</form>
