<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { invalidDestination, invalidAmount } from '$lib/utils/send.utils';
	import { createEventDispatcher } from 'svelte';
	import SendFormActions from '$lib/components/send/SendFormActions.svelte';

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
		placeholder="Enter ICP account identifier"
	/>

	<label for="amount" class="font-bold px-1.25">Amount:</label>
	<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

	<SendFormActions on:icClose {invalid} />
</form>
