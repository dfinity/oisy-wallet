<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import EthTokenModal from '$eth/components/tokens/EthTokenModal.svelte';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import EthTransactionsSkeletons from '$eth/components/transactions/EthTransactionsSkeletons.svelte';
	import { sortedEthTransactions } from '$eth/derived/eth-transactions.derived';
	import { nativeEthereumTokenId } from '$eth/derived/token.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { TRANSACTIONS_DATE_GROUP_PREFIX } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		modalEthTransaction,
		modalEthToken,
		modalEthTokenData
	} from '$lib/derived/modal.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';

	let ckMinterInfoAddresses = $derived(
		toCkMinterInfoAddresses($ckEthMinterInfoStore?.[$nativeEthereumTokenId])
	);

	let sortedTransactionsUi = $derived(
		$sortedEthTransactions.map(({ data: transaction }) =>
			mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: $ethAddress
			})
		)
	);

	let { transaction: selectedTransaction, token: selectedToken } = $derived(
		mapTransactionModalData<EthTransactionUi>({
			$modalOpen: $modalEthTransaction,
			$modalStore
		})
	);

	let token = $derived($tokenWithFallback);

	let groupedTransactions = $derived(
		nonNullish(sortedTransactionsUi)
			? groupTransactionsByDate(
					sortedTransactionsUi.map((transaction) => ({ component: 'ethereum', transaction, token }))
				)
			: undefined
	);
</script>

<Header>{$i18n.transactions.text.title}</Header>

<EthTransactionsSkeletons>
	{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
		{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
			<TransactionsDateGroup
				{formattedDate}
				testId={`${TRANSACTIONS_DATE_GROUP_PREFIX}-eth-${index}`}
				{transactions}
			/>
		{/each}
	{/if}

	{#if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
		<TransactionsPlaceholder />
	{/if}
</EthTransactionsSkeletons>

{#if $modalEthTransaction && nonNullish(selectedTransaction)}
	<EthTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalEthToken}
	<EthTokenModal fromRoute={$modalEthTokenData} />
{/if}
