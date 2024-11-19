<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		modalBtcTransaction,
		modalIcTransaction,
		modalEthTransaction
	} from '$lib/derived/modal.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { AllTransactionUi, TransactionsUiDateGroup } from '$lib/types/transaction';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionUi[];
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore,
		$ethTransactions: $ethTransactionsStore,
		$ckEthMinterInfo: $ckEthMinterInfoStore,
		$ethAddress: $ethAddress,
		$icTransactions: $icTransactionsStore,
		$btcStatuses: $btcStatusesStore
	});

	let sortedTransactions: AllTransactionUi[];
	$: sortedTransactions = transactions.sort((a, b) =>
		sortTransactions({ transactionA: a, transactionB: b })
	);

	let groupedTransactions: TransactionsUiDateGroup<AllTransactionUi> | undefined;
	$: groupedTransactions = nonNullish(sortedTransactions)
		? groupTransactionsByDate(sortedTransactions)
		: undefined;

	let selectedBtcTransaction: BtcTransactionUi | undefined;
	$: selectedBtcTransaction = $modalBtcTransaction
		? ($modalStore?.data as BtcTransactionUi | undefined)
		: undefined;

	let selectedEthTransaction: EthTransactionUi | undefined;
	$: selectedEthTransaction = $modalEthTransaction
		? ($modalStore?.data as EthTransactionUi | undefined)
		: undefined;

	let selectedIcTransaction: IcTransactionUi | undefined;
	let selectedIcToken: OptionToken;
	$: ({ transaction: selectedIcTransaction, token: selectedIcToken } =
		mapTransactionModalData<IcTransactionUi>({
			$modalOpen: $modalIcTransaction,
			$modalStore: $modalStore
		}));
</script>

<!--TODO: include skeleton for loading transactions and remove nullish checks-->
{#if nonNullish(groupedTransactions) && sortedTransactions.length > 0}
	{#each Object.entries(groupedTransactions) as [date, transactions] (date)}
		<TransactionsDateGroup {date} {transactions} />
	{/each}
{/if}

{#if isNullish(groupedTransactions) || sortedTransactions.length === 0}
	<TransactionsPlaceholder />
{/if}

{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
	<BtcTransactionModal transaction={selectedBtcTransaction} />
{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
	<EthTransactionModal transaction={selectedEthTransaction} />
{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
	<IcTransactionModal transaction={selectedIcTransaction} token={selectedIcToken} />
{/if}
