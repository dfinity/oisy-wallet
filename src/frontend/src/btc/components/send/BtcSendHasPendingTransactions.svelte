<script lang="ts">
	import { fade } from 'svelte/transition';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let pendingTransactionsStatus: boolean | 'loading' | 'error';
</script>

{#if pendingTransactionsStatus === true}
	<div in:fade>
		<WarningBanner>{$i18n.send.info.pending_bitcoin_transaction}</WarningBanner>
	</div>
{:else if pendingTransactionsStatus === 'error'}
	<div in:fade>
		<WarningBanner>{$i18n.send.error.no_pending_bitcoin_transaction}</WarningBanner>
	</div>
{/if}
