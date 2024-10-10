<script lang="ts">
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { fade } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';

	export let pendingTransactionsStatus: boolean | 'loading' | 'error';
</script>

<div in:fade>
	{#if pendingTransactionsStatus === true}
		<WarningBanner>{$i18n.send.info.pending_bitcoin_transaction}</WarningBanner>
	{:else if pendingTransactionsStatus === 'error'}
		<WarningBanner>{$i18n.send.error.no_pending_bitcoin_transaction}</WarningBanner>
	{/if}
</div>
