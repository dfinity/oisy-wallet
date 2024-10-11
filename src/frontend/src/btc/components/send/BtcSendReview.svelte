<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Readable } from 'svelte/store';
	import BtcSendHasPendingTransactions from './BtcSendHasPendingTransactions.svelte';
	import BtcUtxosFee from '$btc/components/send/BtcUtxosFee.svelte';
	import {
		BtcPendingSentTransactionsStatus,
		initPendingSentTransactionsStatus
	} from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import type { UtxosFee } from '$btc/types/btc-send';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;
	export let utxosFee: UtxosFee | undefined = undefined;
	export let progress: (step: ProgressStepsSendBtc) => void;

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus>;
	$: hasPendingTransactionsStore = initPendingSentTransactionsStatus(source);

	let disableSend: boolean;
	// We want to disable send if pending transactions or UTXOs fee isn't available yet, there was an error or there are pending transactions.
	$: disableSend =
		$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
		isNullish(utxosFee) ||
		invalid;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isInvalidDestinationBtc({
			destination,
			networkId
		}) || invalidAmount(amount);
</script>

<SendReview on:icBack on:icSend {source} {amount} {destination} disabled={disableSend}>
	<BtcUtxosFee slot="fee" bind:utxosFee {progress} {networkId} {amount} />

	<BtcSendHasPendingTransactions
		slot="info"
		pendingTransactionsStatus={$hasPendingTransactionsStore}
	/>
</SendReview>
