<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { DEFAULT_SOLANA_TOKEN } from '$lib/constants/tokens.constants';
	import {
		modalSolToken,
		modalSolTokenData,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import SolTokenModal from '$sol/components/tokens/SolTokenModal.svelte';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import SolTransactionsScroll from '$sol/components/transactions/SolTransactionsScroll.svelte';
	import SolTransactionsSkeletons from '$sol/components/transactions/SolTransactionsSkeletons.svelte';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';

	let selectedTransaction = $state<SolTransactionUi | undefined>();
	let selectedToken = $state<OptionToken>();
	$effect(() => {
		({ transaction: selectedTransaction, token: selectedToken } =
			mapTransactionModalData<SolTransactionUi>({
				$modalOpen: $modalSolTransaction,
				$modalStore
			}));
	});

	let token = $derived($pageToken ?? DEFAULT_SOLANA_TOKEN);

	let groupedTransactions = $derived(
		nonNullish($solTransactions)
			? groupTransactionsByDate(
					$solTransactions.map((trx) => ({ component: 'solana', transaction: trx, token }))
				)
			: undefined
	);
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<SolTransactionsSkeletons>
	{#if $solTransactions.length > 0}
		<SolTransactionsScroll {token}>
			{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
				{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
					<TransactionsDateGroup
						{formattedDate}
						testId={`sol-transactions-date-group-${index}`}
						{transactions}
					/>
				{/each}
			{/if}
		</SolTransactionsScroll>
	{:else if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
		<TransactionsPlaceholder />
	{/if}
</SolTransactionsSkeletons>

{#if $modalSolTransaction && nonNullish(selectedTransaction)}
	<SolTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalSolToken}
	<SolTokenModal fromRoute={$modalSolTokenData} />
{/if}
