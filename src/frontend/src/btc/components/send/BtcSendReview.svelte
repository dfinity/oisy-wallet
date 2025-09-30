<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import BtcReviewNetwork from '$btc/components/send/BtcReviewNetwork.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import BtcUtxosFee from '$btc/components/send/BtcUtxosFee.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import type { UtxosFee } from '$btc/types/btc-send';
	import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		source: string;
		utxosFee?: UtxosFee;
		selectedContact?: ContactUi;
		onBack: () => void;
		onSend: () => void;
	}

	let {
		destination = '',
		amount,
		source,
		utxosFee = $bindable(),
		selectedContact,
		onBack,
		onSend
	}: Props = $props();

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let hasPendingTransactionsStore = $derived(initPendingSentTransactionsStatus(source));

	// When BTC extension is enabled, we allow parallel transactions, so return NONE status
	let pendingTransactionsStatus = $derived(
		BTC_EXTENSION_FEATURE_FLAG_ENABLED
			? BtcPendingSentTransactionsStatus.NONE
			: $hasPendingTransactionsStore
	);

	// We want to disable sending if pending transactions or UTxOs fee isn't available yet, there was an error, or there are pending transactions.
	let disableSend = $derived(
		pendingTransactionsStatus !== BtcPendingSentTransactionsStatus.NONE ||
			isNullish(utxosFee) ||
			nonNullish(utxosFee?.error) ||
			isInvalidDestinationBtc({
				destination,
				networkId: $sendTokenNetworkId
			}) ||
			invalidAmount(amount) ||
			utxosFee.utxos.length === 0
	);
</script>

<SendReview {amount} {destination} disabled={disableSend} {onBack} {onSend} {selectedContact}>
	{#snippet network()}
		<BtcReviewNetwork networkId={$sendTokenNetworkId} />
	{/snippet}

	{#snippet fee()}
		<BtcUtxosFee {amount} networkId={$sendTokenNetworkId} {source} bind:utxosFee />
	{/snippet}

	{#snippet info()}
		<div class="mt-8">
			<!-- TODO remove pendingTransactionsStatus as soon as parallel BTC transactions are also enabled for BTC convert -->
			<BtcSendWarnings {pendingTransactionsStatus} {utxosFee} />
		</div>
	{/snippet}
</SendReview>
