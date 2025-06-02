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
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let source: string;
	export let utxosFee: UtxosFee | undefined = undefined;
	export let selectedContact: ContactUi | undefined = undefined;

	const { sendBalance, sendTokenDecimals, sendTokenNetworkId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let hasPendingTransactionsStore: Readable<BtcPendingSentTransactionsStatus>;
	$: hasPendingTransactionsStore = initPendingSentTransactionsStatus(source);

	// TODO: in the updated Send flow designs, this check will be done one step before in BtcSendForm
	let insufficientFundsForFee: boolean;
	$: insufficientFundsForFee =
		nonNullish(utxosFee) && nonNullish($sendBalance) && nonNullish(amount)
			? parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}) +
					utxosFee.feeSatoshis >
				$sendBalance
			: false;

	let disableSend: boolean;
	// We want to disable send if pending transactions or UTXOs fee isn't available yet, there was an error or there are pending transactions.
	$: disableSend =
		$hasPendingTransactionsStore !== BtcPendingSentTransactionsStatus.NONE ||
		isNullish(utxosFee) ||
		utxosFee.utxos.length === 0 ||
		insufficientFundsForFee ||
		invalid;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isInvalidDestinationBtc({
			destination,
			networkId: $sendTokenNetworkId
		}) || invalidAmount(amount);
</script>

<SendReview on:icBack on:icSend {amount} {destination} {selectedContact} disabled={disableSend}>
	<BtcReviewNetwork networkId={$sendTokenNetworkId} slot="network" />

	<BtcUtxosFee slot="fee" bind:utxosFee networkId={$sendTokenNetworkId} {amount} />

	<div class="mt-8" slot="info">
		{#if insufficientFundsForFee}
			<InsufficientFundsForFee testId="btc-send-form-insufficient-funds-for-fee" />
		{:else}
			<BtcSendWarnings {utxosFee} pendingTransactionsStatus={$hasPendingTransactionsStore} />
		{/if}
	</div>
</SendReview>
