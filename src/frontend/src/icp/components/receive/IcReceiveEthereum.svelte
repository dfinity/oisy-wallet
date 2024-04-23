<script lang="ts">
	import { blur } from 'svelte/transition';
	import type { SyncState } from '$lib/types/sync';
	import { i18n } from '$lib/stores/i18n.store';

	let ckEthPendingTransactionsSyncState: SyncState | undefined = undefined;
	const onSyncPendingState = ({ detail: state }: CustomEvent<SyncState>) =>
		(ckEthPendingTransactionsSyncState = state);

	let ckEthMinterInfoSyncState: SyncState | undefined = undefined;
	const onSyncMinterInfoState = ({ detail: state }: CustomEvent<SyncState>) =>
		(ckEthMinterInfoSyncState = state);
</script>

<svelte:window
	on:oisyCkEthereumPendingTransactions={onSyncPendingState}
	on:oisyCkEthMinterInfoStatus={onSyncMinterInfoState}
/>

{#if ckEthPendingTransactionsSyncState === 'in_progress' || ckEthMinterInfoSyncState === 'in_progress'}
	<div class="text-misty-rose animate-pulse">
		<span transition:blur>{$i18n.receive.ethereum.text.checking_status}</span>
	</div>
{/if}
