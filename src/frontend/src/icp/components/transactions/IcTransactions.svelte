<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import Info from '$icp/components/info/Info.svelte';
	import IcTokenModal from '$icp/components/tokens/IcTokenModal.svelte';
	import IcIndexCanisterStatus from '$icp/components/transactions/IcIndexCanisterStatus.svelte';
	import IcNoIndexPlaceholder from '$icp/components/transactions/IcNoIndexPlaceholder.svelte';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import IcTransactionsBitcoinStatus from '$icp/components/transactions/IcTransactionsBitcoinStatusBalance.svelte';
	import IcTransactionsEthereumStatus from '$icp/components/transactions/IcTransactionsEthereumStatus.svelte';
	import IcTransactionsScroll from '$icp/components/transactions/IcTransactionsScroll.svelte';
	import IcTransactionsSkeletons from '$icp/components/transactions/IcTransactionsSkeletons.svelte';
	import {
		tokenAsIcToken,
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { hasIndexCanister } from '$icp/validation/ic-token.validation';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { TRANSACTIONS_DATE_GROUP_PREFIX } from '$lib/constants/test-ids.constants';
	import { modalIcToken, modalIcTokenData, modalIcTransaction } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';

	let ckEthereum = $derived($tokenCkEthLedger || $tokenCkErc20Ledger);

	let { transaction: selectedTransaction, token: selectedToken } = $derived(
		mapTransactionModalData<IcTransactionUi>({
			$modalOpen: $modalIcTransaction,
			$modalStore
		})
	);

	let noTransactions = $derived(
		nonNullish($pageToken) && $icTransactionsStore?.[$pageToken.id] === null
	);

	let token = $derived($pageToken ?? ICP_TOKEN);

	let groupedTransactions = $derived(
		nonNullish($icTransactions)
			? groupTransactionsByDate(
					$icTransactions.map(({ data: transaction }) => ({ component: 'ic', transaction, token }))
				)
			: undefined
	);
</script>

<Info />

<Header>
	{$i18n.transactions.text.title}

	{#snippet end()}
		<IcIndexCanisterStatus>
			{#if $tokenCkBtcLedger}
				<IcTransactionsBitcoinStatus />
			{:else if ckEthereum}
				<IcTransactionsEthereumStatus />
			{/if}
		</IcIndexCanisterStatus>
	{/snippet}
</Header>

<IcTransactionsSkeletons>
	{#if $icTransactions.length > 0}
		<IcTransactionsScroll {token}>
			{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
				{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
					<TransactionsDateGroup
						{formattedDate}
						testId={`${TRANSACTIONS_DATE_GROUP_PREFIX}-ic-${index}`}
						{transactions}
					/>
				{/each}
			{/if}
		</IcTransactionsScroll>
	{/if}

	{#if noTransactions}
		<IcNoIndexPlaceholder
			placeholderType={hasIndexCanister($tokenAsIcToken) ? 'not-working' : 'missing'}
		/>
	{:else if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
		<TransactionsPlaceholder />
	{/if}
</IcTransactionsSkeletons>

{#if $modalIcTransaction && nonNullish(selectedTransaction)}
	<IcTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalIcToken}
	<IcTokenModal fromRoute={$modalIcTokenData} />
{/if}
