<script lang="ts">
	import { isNullish } from '@dfinity/utils';
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
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;
	export let utxosFee: UtxosFee | undefined = undefined;

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus>;
	$: hasPendingTransactionsStore = initPendingSentTransactionsStatus(source);

	let disableSend: boolean;
	// We want to disable send if pending transactions or UTXOs fee isn't available yet, there was an error or there are pending transactions.
	$: disableSend =
		$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
		isNullish(utxosFee) ||
		utxosFee.utxos.length === 0 ||
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
	<BtcReviewNetwork {networkId} slot="network" />

	<BtcUtxosFee slot="fee" bind:utxosFee {networkId} {amount} />

	<BtcSendWarnings
		slot="info"
		{utxosFee}
		pendingTransactionsStatus={$hasPendingTransactionsStore}
	/>
</SendReview>
