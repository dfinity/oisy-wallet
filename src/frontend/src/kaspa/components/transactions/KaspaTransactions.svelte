<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import KaspaTokenModal from '$kaspa/components/tokens/KaspaTokenModal.svelte';
	import KaspaTransactionModal from '$kaspa/components/transactions/KaspaTransactionModal.svelte';
	import { kaspaTransactionsStore } from '$kaspa/stores/kaspa-transactions.store';
	import type { KaspaTransactionUi } from '$kaspa/types/kaspa-transaction';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { TRANSACTIONS_DATE_GROUP_PREFIX } from '$lib/constants/test-ids.constants';
	import {
		modalKaspaToken,
		modalKaspaTokenData,
		modalKaspaTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';

	let { transaction: selectedTransaction, token: selectedToken } = $derived(
		mapTransactionModalData<KaspaTransactionUi>({
			$modalOpen: $modalKaspaTransaction,
			$modalStore
		})
	);

	let token = $derived($pageToken);

	let kaspaTransactions = $derived(
		nonNullish(token) && nonNullish($kaspaTransactionsStore?.[token.id])
			? $kaspaTransactionsStore[token.id]
			: undefined
	);

	let groupedTransactions = $derived(
		nonNullish(kaspaTransactions)
			? groupTransactionsByDate(
					kaspaTransactions.map(({ data: transaction }) => ({
						component: 'kaspa' as const,
						transaction,
						token: token!
					}))
				)
			: undefined
	);
</script>

<TransactionsSkeletons loading={isNullish(kaspaTransactions)}>
	{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
		{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
			<TransactionsDateGroup
				{formattedDate}
				testId={`${TRANSACTIONS_DATE_GROUP_PREFIX}-kaspa-${index}`}
				{transactions}
			/>
		{/each}
	{/if}

	{#if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
		<TransactionsPlaceholder />
	{/if}
</TransactionsSkeletons>

{#if $modalKaspaTransaction && nonNullish(selectedTransaction)}
	<KaspaTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalKaspaToken}
	<KaspaTokenModal fromRoute={$modalKaspaTokenData} />
{/if}
