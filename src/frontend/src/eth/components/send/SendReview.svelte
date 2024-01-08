<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { isNullish } from '@dfinity/utils';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token } from '$lib/derived/token.derived';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { address } from '$lib/derived/address.derived';
	import FeeDisplay from '$eth/fee/FeeDisplay.svelte';
	import type { Network } from '$lib/types/network';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let network: Network | undefined = undefined;

	const { store: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let invalid = true;
	$: invalid = isNullishOrEmpty(destination) || invalidAmount(amount) || isNullish($storeFeeData);

	const dispatch = createEventDispatcher();
</script>

<SendData {amount} {destination} token={$token} source={$address ?? ''} {network}>
	<FeeDisplay slot="fee" />
</SendData>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSend')}
	>
		Send
	</button>
</div>
