<script lang="ts">
	import { blur } from 'svelte/transition';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SyncState } from '$lib/types/sync';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

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
	<div class="animate-pulse text-tertiary">
		<span transition:blur
			>{replacePlaceholders($i18n.receive.ethereum.text.checking_status, {
				$token: $ckEthereumTwinToken.symbol
			})}</span
		>
	</div>
{/if}
