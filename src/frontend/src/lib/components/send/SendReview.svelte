<script lang="ts">
	import { getContext } from 'svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import { isNullish } from '@dfinity/utils';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$lib/stores/fee.store';
	import SendData from '$lib/components/send/SendData.svelte';
	import { token } from '$lib/derived/token.derived';
	import SendReviewActions from '$lib/components/send/SendReviewActions.svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;

	const { store: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let invalid = true;
	$: invalid = invalidDestination(destination) || invalidAmount(amount) || isNullish($storeFeeData);
</script>

<SendData {amount} {destination} token={$token} />

<SendReviewActions {invalid} on:icSend on:icBack />
