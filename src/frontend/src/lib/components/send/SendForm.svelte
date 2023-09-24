<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { invalidDestination, invalidAmount } from '$lib/utils/send.utils';
	import { createEventDispatcher } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { token } from '$lib/derived/token.derived';
	import SendDestination from "$lib/components/send/SendDestination.svelte";
	import SendFormActions from '$lib/components/send/SendFormActions.svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<SendDestination bind:destination />

	<label for="amount" class="font-bold px-1.25">Amount:</label>
	<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

	<SendSource token={$token} />

	<FeeDisplay />

	<SendFormActions on:icClose {invalid} />
</form>
