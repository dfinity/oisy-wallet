<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import BtcTokenModal from '$btc/components/tokens/BtcTokenModal.svelte';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import BtcTransactionsHeader from '$btc/components/transactions/BtcTransactionsHeader.svelte';
	import {
		sortedBtcTransactions,
		btcTransactionsNotInitialized
	} from '$btc/derived/btc-transactions.derived';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { DEFAULT_BITCOIN_TOKEN } from '$lib/constants/tokens.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		modalBtcToken,
		modalBtcTokenData,
		modalBtcTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';

	let selectedTransaction = $state<BtcTransactionUi | undefined>();
	let selectedToken = $state<OptionToken>();
	$effect(() => {
		({ transaction: selectedTransaction, token: selectedToken } =
			mapTransactionModalData<BtcTransactionUi>({
				$modalOpen: $modalBtcTransaction,
				$modalStore
			}));
	});

	let token = $derived($pageToken ?? DEFAULT_BITCOIN_TOKEN);

	let groupedTransactions = $derived(
		nonNullish($sortedBtcTransactions)
			? groupTransactionsByDate(
					$sortedBtcTransactions.map((ctrx) => ({
						component: 'bitcoin',
						transaction: ctrx.data,
						token
					}))
				)
			: undefined
	);
</script>

<BtcTransactionsHeader />

<TransactionsSkeletons loading={$btcTransactionsNotInitialized}>
	{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
		{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
			<TransactionsDateGroup
				{formattedDate}
				testId={`btc-transactions-date-group-${index}`}
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
