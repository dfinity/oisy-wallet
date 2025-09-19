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
	import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import AllTransactionsLoader from '$lib/components/transactions/AllTransactionsLoader.svelte';
	import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { ACTIVITY_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		modalBtcTransaction,
		modalEthTransaction,
		modalIcTransaction,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import {
		enabledFungibleNetworkTokens,
		enabledNonFungibleNetworkTokens
	} from '$lib/derived/network-tokens.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import type { AllTransactionUiWithCmp, TransactionsUiDateGroup } from '$lib/types/transaction';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	let transactions: AllTransactionUiWithCmp[];
	$: transactions = mapAllTransactionsUi({
		tokens: [...$enabledFungibleNetworkTokens, ...$enabledNonFungibleNetworkTokens],
		$btcTransactions: $btcTransactionsStore,
		$ethTransactions: $ethTransactionsStore,
		$ckEthMinterInfo: $ckEthMinterInfoStore,
		$ethAddress,
		$btcStatuses: $btcStatusesStore,
		$solTransactions: $solTransactionsStore,
		$icTransactionsStore,
		$ckBtcMinterInfoStore,
		$icPendingTransactionsStore,
		$ckBtcPendingUtxosStore
	});

	$: console.log('transactions', JSON.stringify(transactions));

	let sortedTransactions: AllTransactionUiWithCmp[] | undefined;
	$: sortedTransactions = nonNullish(transactions)
		? transactions.sort(({ transaction: a }, { transaction: b }) =>
				sortTransactions({ transactionA: a, transactionB: b })
			)
		: undefined;

	let groupedTransactions: TransactionsUiDateGroup<AllTransactionUiWithCmp> | undefined;
	$: groupedTransactions = nonNullish(sortedTransactions)
		? groupTransactionsByDate(sortedTransactions)
		: undefined;

	let selectedBtcTransaction: BtcTransactionUi | undefined;
	let selectedBtcToken: OptionToken;
	$: ({ transaction: selectedBtcTransaction, token: selectedBtcToken } =
		mapTransactionModalData<BtcTransactionUi>({
			$modalOpen: $modalBtcTransaction,
			$modalStore
		}));

	let selectedEthTransaction: EthTransactionUi | undefined;
	let selectedEthToken: OptionToken;
	$: ({ transaction: selectedEthTransaction, token: selectedEthToken } =
		mapTransactionModalData<EthTransactionUi>({
			$modalOpen: $modalEthTransaction,
			$modalStore
		}));

	let selectedIcTransaction: IcTransactionUi | undefined;
	let selectedIcToken: OptionToken;
	$: ({ transaction: selectedIcTransaction, token: selectedIcToken } =
		mapTransactionModalData<IcTransactionUi>({
			$modalOpen: $modalIcTransaction,
			$modalStore
		}));

	let selectedSolTransaction: SolTransactionUi | undefined;
	let selectedSolToken: OptionToken;
	$: ({ transaction: selectedSolTransaction, token: selectedSolToken } =
		mapTransactionModalData<SolTransactionUi>({
			$modalOpen: $modalSolTransaction,
			$modalStore
		}));
</script>

<AllTransactionsSkeletons testIdPrefix={ACTIVITY_TRANSACTION_SKELETON_PREFIX}>
	<AllTransactionsLoader {transactions}>
		{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
			{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
				<TransactionsDateGroup
					{formattedDate}
					testId={`all-transactions-date-group-${index}`}
					{transactions}
				/>
			{/each}
		{/if}

		{#if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
			<TransactionsPlaceholder />
		{/if}
	</AllTransactionsLoader>
</AllTransactionsSkeletons>

{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
	<BtcTransactionModal token={selectedBtcToken} transaction={selectedBtcTransaction} />
{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
	<EthTransactionModal token={selectedEthToken} transaction={selectedEthTransaction} />
{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
	<IcTransactionModal token={selectedIcToken} transaction={selectedIcTransaction} />
{:else if $modalSolTransaction && nonNullish(selectedSolTransaction)}
	<SolTransactionModal token={selectedSolToken} transaction={selectedSolTransaction} />
{/if}
