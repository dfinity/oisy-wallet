<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
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

	const { feeDecimalsStore, feeSymbolStore, feeTokenIdStore }: FeeContext =
		getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let amountError = $state<SolAmountAssertionError | undefined>();

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) || invalidSolAddress(destination)
	);

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
		<SolSendAmount {onTokensList} bind:amount bind:amountError />
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
</SendForm>
