<script lang="ts">
	import type { Snippet } from 'svelte';
	import { blur } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SyncState } from '$lib/types/sync';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let indexCanisterSyncState = $state<SyncState | undefined>();

	const onSyncPendingState = ({ detail: state }: CustomEvent<SyncState>) =>
		(indexCanisterSyncState = state);
</script>

<svelte:window on:oisyDiscordantIndexCanisterBalance={onSyncPendingState} />

{#if indexCanisterSyncState === 'in_progress'}
	<div class="animate-pulse text-tertiary">
		<span transition:blur>{$i18n.receive.icp.text.checking_index_canister_status}</span>
	</div>
{:else}
	{@render children()}
{/if}
