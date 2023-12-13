<script lang="ts">
	import { icpTransactionsStore } from '$lib/stores/icp-transactions.store';
	import type { TransactionWithId } from '@dfinity/ledger-icp';
	import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
	import IcpTransactionsSkeletons from '$lib/components/transactions/icp/IcpTransactionsSkeletons.svelte';
	import IcpTransaction from '$lib/components/transactions/icp/IcpTransaction.svelte';
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { last } from '$lib/utils/array.utils';
	import { isNullish } from '@dfinity/utils';
	import { getTransactions } from '$lib/api/icp-index.api';
	import { authStore } from '$lib/stores/auth.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { ICP_WALLET_PAGINATION } from '$lib/constants/icp.constants';

	let transactions: TransactionWithId[];
	$: transactions = $icpTransactionsStore[ICP_TOKEN_ID] ?? [];

	let disableInfiniteScroll = false;

	const onIntersect = async () => {
		if (isNullish($authStore.identity)) {
			toastsError({
				msg: { text: 'You are not signed-in.' }
			});
			return;
		}

		const lastId = last(transactions)?.id;

		if (isNullish(lastId)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		try {
			const { transactions: nextTransactions } = await getTransactions({
				owner: $authStore.identity.getPrincipal(),
				identity: $authStore.identity,
				maxResults: ICP_WALLET_PAGINATION,
				start: lastId
			});

			if (nextTransactions.length === 0) {
				disableInfiniteScroll = true;
				return;
			}

			icpTransactionsStore.append({ tokenId: ICP_TOKEN_ID, transactions: nextTransactions });
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Something went wrong while fetching the transactions.' },
				err
			});

			disableInfiniteScroll = true;
		}
	};
</script>

<IcpTransactionsSkeletons>
	{#if transactions.length > 0}
		<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
			{#each transactions as transaction, index (`${transaction.id}-${index}`)}
				<IcpTransaction {transaction} />
			{/each}
		</InfiniteScroll>
	{/if}

	{#if transactions.length === 0}
		<p class="mt-4 text-dark opacity-50">You have no transactions.</p>
	{/if}
</IcpTransactionsSkeletons>
