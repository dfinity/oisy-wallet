<script lang="ts">
	import { blur } from 'svelte/transition';
	import type { SyncState } from '$lib/types/sync';
	import { debounce } from '@dfinity/utils';

	let ckEthPendingTransactionsSyncState: SyncState | undefined = undefined;
	const debounceUpdateSyncState = debounce(
		(state: SyncState) => (ckEthPendingTransactionsSyncState = state)
	);
	const onSyncState = ({ detail: state }: CustomEvent<SyncState>) => debounceUpdateSyncState(state);
</script>

<svelte:window on:oisyCkEthPendingTransactions={onSyncState} />

{#if ckEthPendingTransactionsSyncState === 'in_progress'}
	<div class="text-misty-rose animate-pulse">
		<span in:blur>Checking ETH status...</span>
	</div>
{/if}
