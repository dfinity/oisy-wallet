<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';
	import { invalidSolAddress } from '$sol/utils/sol-address.utils';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;

	let invalidDestination = false;
	$: invalidDestination = isNullishOrEmpty(destination) || invalidSolAddress(destination);

	let invalid = true;
	$: invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);
</script>

<SendForm
	on:icNext
	on:icBack
	{source}
	{destination}
	{invalidDestination}
	token={$sendToken}
	balance={$sendBalance}
	disabled={invalid}
	hideSource
>
	<SolSendAmount slot="amount" bind:amount bind:amountError on:icTokensList />

	<SolFeeDisplay slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
