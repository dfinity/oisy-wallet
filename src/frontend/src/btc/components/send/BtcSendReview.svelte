<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { run } from 'svelte/legacy';
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

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		source: string;
		utxosFee?: UtxosFee | undefined;
		selectedContact?: ContactUi;
	}

	let {
		destination = '',
		amount = undefined,
		source,
		utxosFee = $bindable(),
		selectedContact = undefined
	}: Props = $props();

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus> = $derived(
		initPendingSentTransactionsStatus(source)
	);

	let disableSend: boolean = $derived(
		$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
			isNullish(utxosFee) ||
			(nonNullish(utxosFee) && (utxosFee.utxos.length === 0 || nonNullish(utxosFee.error))) ||
			invalid
	);

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = $state(true);

	run(() => {
		invalid =
			isInvalidDestinationBtc({
				destination,
				networkId: $sendTokenNetworkId
			}) || invalidAmount(amount);
	});
	// We want to disable send if pending transactions or UTXOs fee isn't available yet, there was an error or there are pending transactions.
</script>

<SendReview {amount} {destination} disabled={disableSend} {selectedContact} on:icBack on:icSend>
	{#snippet network()}
		<BtcReviewNetwork networkId={$sendTokenNetworkId} />
	{/snippet}

	{#snippet fee()}
		<BtcUtxosFee {amount} networkId={$sendTokenNetworkId} {source} bind:utxosFee />
	{/snippet}

	{#snippet info()}
		<div class="mt-8">
			<BtcSendWarnings pendingTransactionsStatus={$hasPendingTransactionsStore} {utxosFee} />
		</div>
	{/snippet}
</SendReview>
