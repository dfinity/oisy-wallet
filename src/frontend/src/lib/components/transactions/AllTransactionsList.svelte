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
	import AllTransactionsLoader from '$lib/components/transactions/AllTransactionsLoader.svelte';
	import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
	import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import TransactionsFilterToolbar from '$lib/components/transactions/filter/TransactionsFilterToolbar.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { ACTIVITY_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		modalBtcTransaction,
		modalEthTransaction,
		modalIcTransaction,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import {
		enabledFungibleNetworkTokens,
		enabledNonFungibleNetworkTokensWithoutSpam
	} from '$lib/derived/network-tokens.derived';
	import { hideMicroTransactions } from '$lib/derived/user-profile.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { applyTransactionsFilter } from '$lib/utils/transactions-filter.utils';
	import {
		filterReceivedMicroTransactions,
		mapAllTransactionsUi,
		sortTransactions
	} from '$lib/utils/transactions.utils';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	let allTransactions = $derived(
		mapAllTransactionsUi({
			tokens: [...$enabledFungibleNetworkTokens, ...$enabledNonFungibleNetworkTokensWithoutSpam],
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
		})
	);

	// Filtering is only applied on the display path. The unfiltered `allTransactions` is fed to
	// `AllTransactionsLoader` so its `transactions.length === 0` short-circuit and `minTimestamp`
	// pagination anchor remain based on the actual loaded set, not the filtered one.
	let microFilteredTransactions = $derived(
		$hideMicroTransactions
			? filterReceivedMicroTransactions({
					transactions: allTransactions,
					exchanges: $exchanges
				})
			: allTransactions
	);

	let displayTransactions = $derived(
		applyTransactionsFilter({
			transactions: microFilteredTransactions,
			filter: $transactionsFilterStore,
			contacts: $allContacts
		})
	);

	let sortedTransactions = $derived(
		displayTransactions.sort(({ transaction: a }, { transaction: b }) =>
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
</script>

<!--
	Each `TransactionsDateGroup` uses `StickyHeader` internally at the
	default `z-3`, creating a sibling stacking context per date label. If
	the toolbar's `StickyHeader` were also at `z-3`, the gix Popover that
	the chips open would be trapped inside the toolbar's `z-3` context and
	the date stickies (also `z-3`, but rendered later in DOM) would paint
	on top of it — visually freezing the dropdown. Bumping to `z-10` lifts
	the popover's containing stacking context above every date `z-3`
	context, so the dropdown content paints on top of the date headers.
-->
<StickyHeader zIndex={10}>
	{#snippet header()}
		<TransactionsFilterToolbar />
	{/snippet}

	<AllTransactionsSkeletons testIdPrefix={ACTIVITY_TRANSACTION_SKELETON_PREFIX}>
		<AllTransactionsLoader transactions={allTransactions}>
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
</StickyHeader>

{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
	<BtcTransactionModal token={selectedBtcToken} transaction={selectedBtcTransaction} />
{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
	<EthTransactionModal token={selectedEthToken} transaction={selectedEthTransaction} />
{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
	<IcTransactionModal token={selectedIcToken} transaction={selectedIcTransaction} />
{:else if $modalSolTransaction && nonNullish(selectedSolTransaction)}
	<SolTransactionModal token={selectedSolToken} transaction={selectedSolTransaction} />
{/if}
