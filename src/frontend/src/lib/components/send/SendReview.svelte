<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { createEventDispatcher } from 'svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendFee from '$lib/components/send/SendFee.svelte';
	import { isNullish } from '@dfinity/utils';
	import type { TransactionFeeData } from '$lib/types/transaction';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let feeData: TransactionFeeData | undefined;

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount) || isNullish(feeData);

	const dispatch = createEventDispatcher();
</script>

<SendDestination {destination} {amount} />

<SendSource />

<SendFee {feeData} />

<div class="flex justify-end gap-1">
	<button class="primary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-15={invalid}
		on:click={() => dispatch('icSend')}
	>
		Send
	</button>
</div>
