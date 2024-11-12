<script lang="ts">
	import { slide } from 'svelte/transition';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionsUi;
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore
	});
</script>

<!--TODO: include skeleton for loading transactions-->

{#if transactions.length > 0}
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<li in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.component} {transaction} />
		</li>
	{/each}
{/if}

{#if transactions.length === 0}
	<TransactionsPlaceholder />
{/if}
