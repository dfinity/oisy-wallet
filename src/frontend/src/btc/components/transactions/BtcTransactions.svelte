<script lang="ts">
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import {
		sortedTransactions,
		transactionsNotInitialized
	} from '$btc/derived/btc-transactions.derived';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<TokensSkeletons loading={$transactionsNotInitialized}>
	{#each $sortedTransactions as transaction (transaction.data.id)}
		<div transition:slide={{ duration: 250 }}>
			<BtcTransaction transaction={transaction.data} />
		</div>
	{/each}

	{#if $sortedTransactions.length === 0}
		<p class="text-secondary mt-4 opacity-50">{$i18n.transactions.text.no_transactions}</p>
	{/if}
</TokensSkeletons>
