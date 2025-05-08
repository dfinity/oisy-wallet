<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onMount } from 'svelte';
	import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let networkId: NetworkId | undefined = undefined;
	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	let amountError: BtcAmountAssertionError | undefined;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalidDestination = false;
	$: invalidDestination =
		isInvalidDestinationBtc({
			destination,
			networkId
		}) || isNullishOrEmpty(destination);

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = true;
	$: invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);

	onMount(() => {
		// This call will load the pending sent transactions for the source address in the store.
		// This data will then be used in the review step. That's why we don't wait here.
		loadBtcPendingSentTransactions({
			identity: $authIdentity,
			networkId,
			address: source
		});
	});
</script>

<SendForm
	on:icNext
	on:icBack
	{source}
	{destination}
	{invalidDestination}
	token={$sendToken}
	balance={$balance}
	disabled={invalid}
	hideSource
>
	<BtcSendAmount slot="amount" bind:amount bind:amountError on:icTokensList />

	<!--	TODO: calculate and display transaction fee	-->

	<slot name="cancel" slot="cancel" />
</SendForm>
