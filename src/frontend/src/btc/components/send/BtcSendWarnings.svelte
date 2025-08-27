<script lang="ts">
	import { fade } from 'svelte/transition';
	import { BtcPendingSentTransactionsStatus } from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { BtcPrepareSendError, BtcSendValidationError, type UtxosFee } from '$btc/types/btc-send';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let pendingTransactionsStatus: BtcPendingSentTransactionsStatus;
	export let utxosFee: UtxosFee | undefined = undefined;
</script>

<!-- TODO remove this as soon as parallel BTC transactions are also enabled for BTC convert -->
{#if pendingTransactionsStatus === BtcPendingSentTransactionsStatus.SOME}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.info.pending_bitcoin_transaction}</span>
		</MessageBox>
	</div>
{:else if pendingTransactionsStatus === BtcPendingSentTransactionsStatus.ERROR}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.error.no_pending_bitcoin_transaction}</span>
		</MessageBox>
	</div>
{/if}

{#if utxosFee?.error === BtcPrepareSendError.InsufficientBalance}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.insufficient_funds}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcPrepareSendError.InsufficientBalanceForFee}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span data-tid="btc-send-form-insufficient-funds-for-fee"
				>{$i18n.fee.assertion.insufficient_funds_for_fee}</span
			>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcPrepareSendError.UtxoLocked}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span data-tid="btc-send-form-utxos-locked">{$i18n.send.assertion.btc_utxo_locked}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcPrepareSendError.PendingTransactionsNotAvailable}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span data-tid="btc-send-form-pending-transactions-not-available"
				>{$i18n.send.assertion.pending_transactions_not_available}</span
			>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcPrepareSendError.MinimumBalance}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.minimum_btc_amount}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.PendingTransactionsNotAvailable}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.pending_transactions_not_available}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.InvalidUtxoData}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.btc_invalid_utxo_data}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.UtxoLocked}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.btc_utxo_locked}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.InvalidFeeCalculation}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.btc_invalid_fee_calculation}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.UtxoFeeMissing}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.utxos_fee_missing}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.InvalidDestination}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.destination_address_invalid}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.error === BtcSendValidationError.InvalidAmount}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.assertion.amount_invalid}</span>
		</MessageBox>
	</div>
{:else if utxosFee?.utxos.length === 0}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.info.no_available_utxos}</span>
		</MessageBox>
	</div>
{/if}
