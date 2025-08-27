<script lang="ts">
	import { fade } from 'svelte/transition';
	import { BtcPendingSentTransactionsStatus } from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let pendingTransactionsStatus: BtcPendingSentTransactionsStatus;
	export let utxosFee: UtxosFee | undefined = undefined;
</script>

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
{:else if utxosFee?.utxos.length === 0}
	<div class="w-full" in:fade>
		<MessageBox level="warning">
			<span>{$i18n.send.info.no_available_utxos}</span>
		</MessageBox>
	</div>
{/if}
