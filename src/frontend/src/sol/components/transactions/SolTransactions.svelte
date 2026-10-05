<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import HiddenMicroTransactionsInfoBox from '$lib/components/transactions/HiddenMicroTransactionsInfoBox.svelte';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { TRANSACTIONS_DATE_GROUP_PREFIX } from '$lib/constants/test-ids.constants';
	import { DEFAULT_SOLANA_TOKEN } from '$lib/constants/tokens.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		modalSolToken,
		modalSolTokenData,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { hideMicroTransactions } from '$lib/derived/user-profile.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { filterReceivedMicroTransactions } from '$lib/utils/transactions.utils';
	import SolTokenModal from '$sol/components/tokens/SolTokenModal.svelte';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import SolTransactionsScroll from '$sol/components/transactions/SolTransactionsScroll.svelte';
	import SolTransactionsSkeletons from '$sol/components/transactions/SolTransactionsSkeletons.svelte';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import { solUnreadableTransactionsWarnings } from '$sol/derived/sol-unreadable-transactions.derived';
	import { solUnreadableTransactionsWarningStore } from '$sol/stores/sol-unreadable-transactions-warning.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	let { transaction: selectedTransaction, token: selectedToken } = $derived(
		mapTransactionModalData<SolTransactionUi>({
			$modalOpen: $modalSolTransaction,
			$modalStore
		})
	);

	let token = $derived($pageToken ?? DEFAULT_SOLANA_TOKEN);

	// Only this token: the page is about one. Dismissal is shared with the Activity page, so closing
	// it here stops naming this token there too.
	let unsupportedTransactionsWarning = $derived(
		$solUnreadableTransactionsWarnings.find(({ token: { id } }) => id === $pageToken?.id)
	);

	let mappedTransactions = $derived(
		$solTransactions.map((transaction) => ({
			component: 'solana' as const,
			transaction,
			token
		}))
	);

	let filteredTransactions = $derived(
		$hideMicroTransactions
			? filterReceivedMicroTransactions({ transactions: mappedTransactions, exchanges: $exchanges })
			: mappedTransactions
	);

	let groupedTransactions = $derived(
		nonNullish($solTransactions) ? groupTransactionsByDate(filteredTransactions) : undefined
	);
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<HiddenMicroTransactionsInfoBox />

<!-- Over an empty list too: the transactions it misses may be all the token has. -->
{#if nonNullish(unsupportedTransactionsWarning)}
	<MessageBox
		level="warning"
		onDismiss={() =>
			solUnreadableTransactionsWarningStore.dismiss([unsupportedTransactionsWarning])}
	>
		{replacePlaceholders($i18n.activity.warning.unsupported_sol_transactions, {
			$token_list: getTokenDisplaySymbol(unsupportedTransactionsWarning.token)
		})}
	</MessageBox>
{/if}

<SolTransactionsSkeletons>
	{#if filteredTransactions.length > 0}
		<SolTransactionsScroll {token}>
			{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
				{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
					<TransactionsDateGroup
						{formattedDate}
						singleToken
						testId={`${TRANSACTIONS_DATE_GROUP_PREFIX}-sol-${index}`}
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
