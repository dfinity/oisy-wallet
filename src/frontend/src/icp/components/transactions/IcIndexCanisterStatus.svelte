<script lang="ts">
	import type { Snippet } from 'svelte';
	import { blur } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let indexCanisterBalanceOutOfSync = $state<boolean>(false);

	const onSyncPendingState = ({ detail: state }: CustomEvent<boolean>) =>
		(indexCanisterBalanceOutOfSync = state);
</script>

<svelte:window on:oisyIndexCanisterBalanceOutOfSync={onSyncPendingState} />

{#if indexCanisterBalanceOutOfSync}
	<div class="animate-pulse text-tertiary">
		<span transition:blur>{$i18n.receive.icp.text.checking_index_canister_status}</span>
	</div>
{:else}
	{@render children()}
{/if}
