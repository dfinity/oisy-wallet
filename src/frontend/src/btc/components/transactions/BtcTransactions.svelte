<script lang="ts">
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import {
		sortedBtcTransactions,
		btcTransactionsNotInitialized
	} from '$btc/derived/btc-transactions.derived';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<TokensSkeletons loading={$btcTransactionsNotInitialized}>
	{#each $sortedBtcTransactions as transaction (transaction.data.id)}
		<div transition:slide={{ duration: 250 }}>
			<BtcTransaction transaction={transaction.data} />
		</div>
	{/each}

	{#if $sortedBtcTransactions.length === 0}
		<p class="text-secondary mt-4 opacity-50">{$i18n.transactions.text.no_transactions}</p>
	{/if}
</TokensSkeletons>
