<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
	import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import XrpFeeDisplay from '$xrp/components/fee/XrpFeeDisplay.svelte';
	import XrpSendAmount from '$xrp/components/send/XrpSendAmount.svelte';
	import XrpSendDestinationTag from '$xrp/components/send/XrpSendDestinationTag.svelte';
	import { type XrpFeeContext, XRP_FEE_CONTEXT_KEY } from '$xrp/stores/xrp-fee.store';
	import type { XrpAmountAssertionError } from '$xrp/types/xrp-send';
	import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';

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

	const { feeDecimalsStore, feeSymbolStore, feeTokenIdStore }: XrpFeeContext =
		getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	let amountError = $state<XrpAmountAssertionError | undefined>();

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) || invalidXrpAddress(destination)
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
	{#snippet topBanner()}
		<ScannedPlainAddressNotice styleClass="mb-6!" />
	{/snippet}

	{#snippet sendAmount()}
		<XrpSendAmount {onTokensList} bind:amount bind:amountError />
		<XrpSendDestinationTag />
	{/snippet}

	{#snippet fee()}
		<XrpFeeDisplay />
	{/snippet}

	{#snippet info()}
		<SendFeeInfo
			decimals={$feeDecimalsStore}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
		/>
	{/snippet}
</SendForm>
