<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet, onMount } from 'svelte';
	import { run } from 'svelte/legacy';
	import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	interface Props {
		amount?: OptionAmount;
		destination?: string;
		source: string;
		selectedContact?: ContactUi;
		cancel?: Snippet;
	}

	let {
		amount = $bindable(),
		destination = '',
		source,
		selectedContact = undefined,
		cancel
	}: Props = $props();

	let amountError: BtcAmountAssertionError | undefined = $state();

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalidDestination = $state(false);
	run(() => {
		invalidDestination =
			isInvalidDestinationBtc({
				destination,
				networkId: $sendTokenNetworkId
			}) || isNullishOrEmpty(destination);
	});

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = $state(true);
	run(() => {
		invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);
	});

	onMount(() => {
		// This call will load the pending sent transactions for the source address in the store.
		// This data will then be used in the review step. That's why we don't wait here.
		loadBtcPendingSentTransactions({
			identity: $authIdentity,
			networkId: $sendTokenNetworkId,
			address: source
		});
	});

	const cancel_render = $derived(cancel);
</script>

<SendForm
	{destination}
	disabled={invalid}
	{invalidDestination}
	{selectedContact}
	on:icNext
	on:icBack
>
	{#snippet amount()}
		<BtcSendAmount bind:amount bind:amountError on:icTokensList />
	{/snippet}

	<!--	TODO: calculate and display transaction fee	-->

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</SendForm>
