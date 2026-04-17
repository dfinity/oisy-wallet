<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import BtcTokenModal from '$btc/components/tokens/BtcTokenModal.svelte';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import BtcTransactionsHeader from '$btc/components/transactions/BtcTransactionsHeader.svelte';
	import {
		sortedBtcTransactions,
		btcTransactionsNotInitialized
	} from '$btc/derived/btc-transactions.derived';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { TRANSACTIONS_DATE_GROUP_PREFIX } from '$lib/constants/test-ids.constants';
	import { DEFAULT_BITCOIN_TOKEN } from '$lib/constants/tokens.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		modalBtcToken,
		modalBtcTokenData,
		modalBtcTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { hideMicroTransactions } from '$lib/derived/user-profile.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { filterReceivedMicroTransactions } from '$lib/utils/transactions.utils';

	let { transaction: selectedTransaction, token: selectedToken } = $derived(
		mapTransactionModalData<BtcTransactionUi>({
			$modalOpen: $modalBtcTransaction,
			$modalStore
		})
	);

	let token = $derived($pageToken ?? DEFAULT_BITCOIN_TOKEN);

	let mappedTransactions = $derived(
		$sortedBtcTransactions?.map(({ data: transaction }) => ({
			component: 'bitcoin' as const,
			transaction,
			token
		})) ?? []
	);

	let filteredTransactions = $derived(
		$hideMicroTransactions
			? filterReceivedMicroTransactions({ transactions: mappedTransactions, exchanges: $exchanges })
			: mappedTransactions
	);

	let groupedTransactions = $derived(
		nonNullish($sortedBtcTransactions) ? groupTransactionsByDate(filteredTransactions) : undefined
	);
</script>

<BtcTransactionsHeader />

<TransactionsSkeletons loading={$btcTransactionsNotInitialized}>
	{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
		{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
			<TransactionsDateGroup
				{formattedDate}
				testId={`${TRANSACTIONS_DATE_GROUP_PREFIX}-btc-${index}`}
				{transactions}
			/>
		{/each}
	{/if}

	{#if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
		<TransactionsPlaceholder />
	{/if}
</TransactionsSkeletons>

{#if $modalBtcTransaction && nonNullish(selectedTransaction)}
	<BtcTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalBtcToken}
	<BtcTokenModal fromRoute={$modalBtcTokenData} />
{/if}
