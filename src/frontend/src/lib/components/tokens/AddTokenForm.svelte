<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	export let contractAddress = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<label for="destination" class="font-bold px-1.25">Contract address:</label>
	<Input
		name="contractAddress"
		inputType="text"
		required
		bind:value={contractAddress}
		placeholder="Enter a contract address"
	/>

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}>Cancel</button>
		<button class="primary" type="submit" disabled={invalid} class:opacity-15={invalid}>
			Next
		</button>
	</div>
</form>
