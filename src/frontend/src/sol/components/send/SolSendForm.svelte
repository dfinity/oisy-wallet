<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';
	import { invalidSolAddress } from '$sol/utils/sol-address.utils';

	interface Props {
		amount?: OptionAmount;
		destination?: string;
		selectedContact?: ContactUi;
		cancel?: Snippet;
	}

	let {
		amount = $bindable(),
		destination = '',
		selectedContact = undefined,
		cancel
	}: Props = $props();

	const { feeDecimalsStore, feeSymbolStore, feeTokenIdStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined = $state();

	let invalidDestination = $state(false);
	run(() => {
		invalidDestination = isNullishOrEmpty(destination) || invalidSolAddress(destination);
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
		<SolSendAmount bind:amount bind:amountError on:icTokensList />
	{/snippet}

	{#snippet fee()}
		<SolFeeDisplay />
	{/snippet}

	{#snippet info()}
		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</SendForm>
