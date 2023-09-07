<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { isNullish } from '@dfinity/utils';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$lib/stores/fee.store';

	export let destination = '';
	export let amount: number | undefined = undefined;

	const { store: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount) || isNullish($storeFeeData);

	const dispatch = createEventDispatcher();
</script>

<SendDestination {destination} {amount} />

<SendSource />

<FeeDisplay />

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
