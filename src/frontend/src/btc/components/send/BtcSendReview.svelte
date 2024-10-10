<script lang="ts">
	import type { Readable } from 'svelte/store';
	import { initHasPendingSentTransactions } from '$btc/derived/has-pending-sent-transactions.derived';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let source: string;

	let hasPendingTransactionsStore: Readable<boolean | 'loading' | 'error'>;
	$: hasPendingTransactionsStore = initHasPendingSentTransactions(source);

	let disableSend: boolean;
	// We want to disable send if pending transactions are loading, there was an error or there are pending transactions.
	$: disableSend = $hasPendingTransactionsStore !== false || invalid;

	// Should never happen given that the same checks are performed on previous wizard step
	let invalid = true;
	$: invalid =
		isInvalidDestinationBtc({
			destination,
			networkId
		}) || invalidAmount(amount);
</script>

<SendReview on:icBack on:icSend {source} {amount} {destination} disabled={disableSend}>
	<svelte:fragment slot="info">
		{#if $hasPendingTransactionsStore === true}
			<WarningBanner>{$i18n.send.info.pending_bitcoin_transaction}</WarningBanner>
		{:else if $hasPendingTransactionsStore === 'error'}
			<WarningBanner>{$i18n.send.error.no_pending_bitcoin_transaction}</WarningBanner>
		{/if}
	</svelte:fragment>
</SendReview>
