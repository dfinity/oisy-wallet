<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import KaspaFeeDisplay from '$kaspa/components/fee/KaspaFeeDisplay.svelte';
	import KaspaSendAmount from '$kaspa/components/send/KaspaSendAmount.svelte';
	import { type KaspaFeeContext, KASPA_FEE_CONTEXT_KEY } from '$kaspa/stores/kaspa-fee.store';
	import type { KaspaAmountAssertionError } from '$kaspa/types/kaspa-send';
	import { isKaspaAddress } from '$kaspa/utils/kaspa-address.utils';

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

	const { feeDecimalsStore, feeSymbolStore, feeTokenIdStore }: KaspaFeeContext =
		getContext<KaspaFeeContext>(KASPA_FEE_CONTEXT_KEY);

	let amountError = $state<KaspaAmountAssertionError | undefined>();

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) || !isKaspaAddress({ address: destination })
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
		<KaspaSendAmount {onTokensList} bind:amount bind:amountError />
	{/snippet}

	{#snippet fee()}
		<KaspaFeeDisplay />
	{/snippet}

	{#snippet info()}
		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	{/snippet}
</SendForm>
