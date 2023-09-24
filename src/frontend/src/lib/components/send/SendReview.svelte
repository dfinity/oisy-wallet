<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import { isNullish } from '@dfinity/utils';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$lib/stores/fee.store';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token } from '$lib/derived/token.derived';
	import {TargetNetwork} from "$lib/enums/network";

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let network: TargetNetwork | undefined = undefined;

	const { store: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount) || isNullish($storeFeeData);

	const dispatch = createEventDispatcher();
</script>

<SendData {amount} {destination} token={$token} {network} />

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-15={invalid}
		on:click={() => dispatch('icSend')}
	>
		Send
	</button>
</div>
