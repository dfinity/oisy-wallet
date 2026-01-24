<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
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
	import KaspaTransactionModal from '$kaspa/components/transactions/KaspaTransactionModal.svelte';
	import { kaspaTransactionsStore } from '$kaspa/stores/kaspa-transactions.store';
	import type { KaspaTransactionUi } from '$kaspa/types/kaspa-transaction';
	import AllTransactionsLoader from '$lib/components/transactions/AllTransactionsLoader.svelte';
	import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
	import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { ACTIVITY_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		modalBtcTransaction,
		modalEthTransaction,
		modalIcTransaction,
		modalKaspaTransaction,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import {
		enabledFungibleNetworkTokens,
		enabledNonFungibleNetworkTokensWithoutSpam
	} from '$lib/derived/network-tokens.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	let transactions = $derived(
		mapAllTransactionsUi({
			tokens: [...$enabledFungibleNetworkTokens, ...$enabledNonFungibleNetworkTokensWithoutSpam],
			$btcTransactions: $btcTransactionsStore,
			$ethTransactions: $ethTransactionsStore,
			$ckEthMinterInfo: $ckEthMinterInfoStore,
			$ethAddress,
			$btcStatuses: $btcStatusesStore,
			$solTransactions: $solTransactionsStore,
			$kaspaTransactions: $kaspaTransactionsStore,
			$icTransactionsStore,
			$ckBtcMinterInfoStore,
			$icPendingTransactionsStore,
			$ckBtcPendingUtxosStore
		})
	);

	let sortedTransactions = $derived(
		transactions.sort(({ transaction: a }, { transaction: b }) =>
			sortTransactions({ transactionA: a, transactionB: b })
		)
	);

	let transactionsToDisplay = $state<AllTransactionUiWithCmp[]>([]);

	let groupedTransactions = $derived(groupTransactionsByDate(transactionsToDisplay));

	let { transaction: selectedBtcTransaction, token: selectedBtcToken } = $derived(
		mapTransactionModalData<BtcTransactionUi>({
			$modalOpen: $modalBtcTransaction,
			$modalStore
		})
	);

	let { transaction: selectedEthTransaction, token: selectedEthToken } = $derived(
		mapTransactionModalData<EthTransactionUi>({
			$modalOpen: $modalEthTransaction,
			$modalStore
		})
	);

	let { transaction: selectedIcTransaction, token: selectedIcToken } = $derived(
		mapTransactionModalData<IcTransactionUi>({
			$modalOpen: $modalIcTransaction,
			$modalStore
		})
	);

	let { transaction: selectedSolTransaction, token: selectedSolToken } = $derived(
		mapTransactionModalData<SolTransactionUi>({
			$modalOpen: $modalSolTransaction,
			$modalStore
		})
	);

	let { transaction: selectedKaspaTransaction, token: selectedKaspaToken } = $derived(
		mapTransactionModalData<KaspaTransactionUi>({
			$modalOpen: $modalKaspaTransaction,
			$modalStore
		})
	);
</script>

<AllTransactionsSkeletons testIdPrefix={ACTIVITY_TRANSACTION_SKELETON_PREFIX}>
	<AllTransactionsLoader {transactions}>
		<AllTransactionsScroll {sortedTransactions} bind:transactionsToDisplay>
			{#if Object.values(groupedTransactions).length > 0}
				{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
					<TransactionsDateGroup
						{formattedDate}
						testId={`all-transactions-date-group-${index}`}
						{transactions}
					/>
				{/each}
			{/if}

			{#if Object.values(groupedTransactions).length === 0}
				<TransactionsPlaceholder />
			{/if}
		</AllTransactionsScroll>
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
{:else if $modalKaspaTransaction && nonNullish(selectedKaspaTransaction)}
	<KaspaTransactionModal token={selectedKaspaToken} transaction={selectedKaspaTransaction} />
{/if}
