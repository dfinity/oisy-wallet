<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	interface Props {
		amount: OptionAmount;
		destination?: string;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		destination = $bindable(''),
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	let amountError = $state<BtcAmountAssertionError | undefined>();

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalidDestination = $derived(
		isInvalidDestinationBtc({
			destination,
			networkId: $sendTokenNetworkId
		}) || isNullishOrEmpty(destination)
	);

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = $derived(invalidDestination || nonNullish(amountError) || isNullish(amount));
</script>

<SendForm
	{cancel}
	{destination}
	disabled={invalid}
	{invalidDestination}
	{onBack}
	{onNext}
	{selectedContact}
>
	{#snippet sendAmount()}
		<BtcSendAmount {onTokensList} bind:amount bind:amountError />
	{/snippet}

	<!--	TODO: calculate and display transaction fee	-->
</SendForm>
