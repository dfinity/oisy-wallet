<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let selectedContact: ContactUi | undefined = undefined;

	let amountError: BtcAmountAssertionError | undefined;

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalidDestination = false;
	$: invalidDestination =
		isInvalidDestinationBtc({
			destination,
			networkId: $sendTokenNetworkId
		}) || isNullishOrEmpty(destination);

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = true;
	$: invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);

	const dispatch = createEventDispatcher();
</script>

<SendForm
	{destination}
	disabled={invalid}
	{invalidDestination}
	onBack={() => dispatch('icBack')}
	onNext={() => dispatch('icNext')}
	{selectedContact}
>
	{#snippet sendAmount()}
		<BtcSendAmount  bind:amount bind:amountError on:icTokensList />
	{/snippet}

	<!--	TODO: calculate and display transaction fee	-->

	{#snippet cancel()}
		<slot name="cancel" />
	{/snippet}
</SendForm>
