<script lang="ts">
	import { fade } from 'svelte/transition';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { BtcPendingSentTransactionsStatus } from '$btc/derived/btc-pending-sent-transactions-status.derived';

	export let pendingTransactionsStatus: BtcPendingSentTransactionsStatus;
</script>

{#if pendingTransactionsStatus === BtcPendingSentTransactionsStatus.PRESENT}
	<div in:fade>
		<WarningBanner>{$i18n.send.info.pending_bitcoin_transaction}</WarningBanner>
	</div>
{:else if pendingTransactionsStatus === BtcPendingSentTransactionsStatus.ERROR}
	<div in:fade>
		<WarningBanner>{$i18n.send.error.no_pending_bitcoin_transaction}</WarningBanner>
	</div>
{/if}
