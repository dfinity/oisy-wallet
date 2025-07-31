<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import BtcReviewNetwork from '$btc/components/send/BtcReviewNetwork.svelte';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import BtcUtxosFee from '$btc/components/send/BtcUtxosFee.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import type { UtxosFee } from '$btc/types/btc-send';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let source: string;
	export let utxosFee: UtxosFee | undefined = undefined;
	export let selectedContact: ContactUi | undefined = undefined;

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus>;
	$: hasPendingTransactionsStore = initPendingSentTransactionsStatus(source);

	let disableSend: boolean;
	// We want to disable send if pending transactions or UTXOs fee isn't available yet, there was an error or there are pending transactions.
	$: disableSend =
		$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
		isNullish(utxosFee) ||
		(nonNullish(utxosFee) && (utxosFee.utxos.length === 0 || nonNullish(utxosFee.error))) ||
		invalid;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isInvalidDestinationBtc({
			destination,
			networkId: $sendTokenNetworkId
		}) || invalidAmount(amount);
</script>

<SendReview {amount} {destination} disabled={disableSend} {selectedContact} on:icBack on:icSend>
	<BtcReviewNetwork slot="network" networkId={$sendTokenNetworkId} />

	<BtcUtxosFee slot="fee" {amount} networkId={$sendTokenNetworkId} {source} bind:utxosFee />

	<div slot="info" class="mt-8">
		<BtcSendWarnings pendingTransactionsStatus={$hasPendingTransactionsStore} {utxosFee} />
	</div>
</SendReview>
