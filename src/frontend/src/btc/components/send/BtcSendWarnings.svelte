<script lang="ts">
	import { fade } from 'svelte/transition';
	import { BtcPendingSentTransactionsStatus } from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let pendingTransactionsStatus: BtcPendingSentTransactionsStatus;
	export let utxosFee: UtxosFee | undefined = undefined;
</script>

{#if pendingTransactionsStatus === BtcPendingSentTransactionsStatus.SOME}
	<div in:fade>
		<WarningBanner>
			<span>{$i18n.send.info.pending_bitcoin_transaction}</span>
		</WarningBanner>
	</div>
{:else if pendingTransactionsStatus === BtcPendingSentTransactionsStatus.ERROR}
	<div in:fade>
		<WarningBanner>
			<span>{$i18n.send.error.no_pending_bitcoin_transaction}</span>
		</WarningBanner>
	</div>
{/if}

{#if utxosFee?.error === BtcPrepareSendError.InsufficientBalance}
	<div in:fade>
		<WarningBanner>
			<span>{$i18n.send.assertion.insufficient_funds}</span>
		</WarningBanner>
	</div>
{:else if utxosFee?.error === BtcPrepareSendError.InsufficientBalanceForFee}
	<div in:fade>
		<WarningBanner>
			<span data-tid="btc-send-form-insufficient-funds-for-fee">{$i18n.fee.assertion.insufficient_funds_for_fee}</span>
		</WarningBanner>
	</div>
{:else if utxosFee?.utxos.length === 0}
	<div in:fade>
		<WarningBanner>
			<span>{$i18n.send.info.no_available_utxos}</span>
		</WarningBanner>
	</div>
{/if}