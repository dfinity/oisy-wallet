<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import BtcSendAmount from '$btc/components/send/BtcSendAmount.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import BtcUtxosFeeDisplay from '$btc/components/send/BtcUtxosFeeDisplay.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	interface Props {
		amount: OptionAmount;
		destination?: string;
		source: string;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		destination = $bindable(''),
		source,
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let amountError = $state<BtcAmountAssertionError | undefined>();

	let hasPendingTransactionsStore = $derived(initPendingSentTransactionsStatus(source));

	// When BTC extension is enabled, we allow parallel transactions, so return NONE status
	let pendingTransactionsStatus = $derived(
		BTC_EXTENSION_FEATURE_FLAG_ENABLED
			? BtcPendingSentTransactionsStatus.NONE
			: $hasPendingTransactionsStore
	);

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalidDestination = $derived(
		isInvalidDestinationBtc({
			destination,
			networkId: $sendTokenNetworkId
		}) || isNullishOrEmpty(destination)
	);

	// TODO: check if we can align this validation flag with other SendForm components (e.g IcSendForm)
	let invalid = $derived(
		invalidDestination ||
			nonNullish(amountError) ||
			isNullish(amount) ||
			pendingTransactionsStatus !== BtcPendingSentTransactionsStatus.NONE ||
			isNullish($storeUtxosFeeData?.utxosFee) ||
			nonNullish($storeUtxosFeeData?.utxosFee.error) ||
			$storeUtxosFeeData?.utxosFee.utxos.length === 0
	);
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

	{#snippet fee()}
		<BtcUtxosFeeDisplay {amount} />
	{/snippet}

	{#snippet info()}
		<div class="mt-8">
			<!-- TODO remove pendingTransactionsStatus as soon as parallel BTC transactions are also enabled for BTC convert -->
			<BtcSendWarnings {pendingTransactionsStatus} utxosFee={$storeUtxosFeeData?.utxosFee} />
		</div>
	{/snippet}
</SendForm>
