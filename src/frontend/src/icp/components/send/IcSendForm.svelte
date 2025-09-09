<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		selectedContact?: ContactUi;
		cancel?: Snippet;
	}

	let {
		destination = '',
		amount = $bindable(),
		selectedContact = undefined,
		cancel
	}: Props = $props();

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: IcAmountAssertionError | undefined = $state();

	let invalidDestination = $state(false);
	run(() => {
		invalidDestination =
			isNullishOrEmpty(destination) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard
			});
	});

	let invalid = $state(true);
	run(() => {
		invalid = invalidDestination || nonNullish(amountError) || isNullish(amount);
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
		<IcSendAmount bind:amount bind:amountError on:icTokensList />
	{/snippet}

	{#snippet fee()}
		<IcTokenFee />
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</SendForm>
