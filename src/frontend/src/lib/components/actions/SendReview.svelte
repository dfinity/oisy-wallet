<script lang="ts">
	import SendSource from '$lib/components/actions/SendSource.svelte';
	import SendDestination from '$lib/components/actions/SendDestination.svelte';
	import { createEventDispatcher } from 'svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount);

	const dispatch = createEventDispatcher();
</script>

<SendDestination {destination} {amount} />

<SendSource />

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
