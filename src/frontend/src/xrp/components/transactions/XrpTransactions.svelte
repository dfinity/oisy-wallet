<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import HiddenMicroTransactionsInfoBox from '$lib/components/transactions/HiddenMicroTransactionsInfoBox.svelte';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { TRANSACTIONS_DATE_GROUP_PREFIX } from '$lib/constants/test-ids.constants';
	import { DEFAULT_XRP_TOKEN } from '$lib/constants/tokens.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { modalXrpTransaction } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { hideMicroTransactions } from '$lib/derived/user-profile.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { groupTransactionsByDate, mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { filterReceivedMicroTransactions } from '$lib/utils/transactions.utils';
	import XrpTransactionModal from '$xrp/components/transactions/XrpTransactionModal.svelte';
	import XrpTransactionsSkeletons from '$xrp/components/transactions/XrpTransactionsSkeletons.svelte';
	import { xrpTransactions } from '$xrp/derived/xrp-transactions.derived';
	import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';

	let { transaction: selectedTransaction, token: selectedToken } = $derived(
		mapTransactionModalData<XrpTransactionUi>({
			$modalOpen: $modalXrpTransaction,
			$modalStore
		})
	);

	let token = $derived($pageToken ?? DEFAULT_XRP_TOKEN);

	let mappedTransactions = $derived(
		$xrpTransactions.map((transaction) => ({
			component: 'xrp' as const,
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
		nonNullish($xrpTransactions) ? groupTransactionsByDate(filteredTransactions) : undefined
	);
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<HiddenMicroTransactionsInfoBox />

<XrpTransactionsSkeletons>
	{#if filteredTransactions.length > 0}
		{#if nonNullish(groupedTransactions) && Object.values(groupedTransactions).length > 0}
			{#each Object.entries(groupedTransactions) as [formattedDate, transactions], index (formattedDate)}
				<TransactionsDateGroup
					{formattedDate}
					testId={`${TRANSACTIONS_DATE_GROUP_PREFIX}-xrp-${index}`}
					{transactions}
				/>
			{/each}
		{/if}
	{:else if isNullish(groupedTransactions) || Object.values(groupedTransactions).length === 0}
		<TransactionsPlaceholder />
	{/if}
</XrpTransactionsSkeletons>

{#if $modalXrpTransaction && nonNullish(selectedTransaction)}
	<XrpTransactionModal token={selectedToken} transaction={selectedTransaction} />
{/if}
