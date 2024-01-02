<script lang="ts">
	import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
	import IcpTransactionsSkeletons from '$lib/components/transactions/icp/IcpTransactionsSkeletons.svelte';
	import IcpTransaction from '$lib/components/transactions/icp/IcpTransaction.svelte';
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { last } from '$lib/utils/array.utils';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getTransactions } from '$lib/api/icp-index.api';
	import { authStore } from '$lib/stores/auth.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { modalIcpTransaction } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { IcpTransaction as IcpTransactionType } from '$lib/types/icp';
	import IcpTransactionModal from '$lib/components/transactions/icp/IcpTransactionModal.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { icTransactionsStore } from '$lib/stores/ic-transactions.store';
	import type { IcTransaction } from '$lib/types/ic';

	let transactions: IcTransaction[];
	$: transactions = $icTransactionsStore[ICP_TOKEN_ID] ?? [];

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
				maxResults: WALLET_PAGINATION,
				start: lastId
			});

			if (nextTransactions.length === 0) {
				disableInfiniteScroll = true;
				return;
			}

			icTransactionsStore.append({ tokenId: ICP_TOKEN_ID, transactions: nextTransactions });
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Something went wrong while fetching the transactions.' },
				err
			});

			disableInfiniteScroll = true;
		}
	};

	let selectedTransaction: IcpTransactionType | undefined;
	$: selectedTransaction = $modalIcpTransaction
		? ($modalStore?.data as IcpTransactionType | undefined)
		: undefined;
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

{#if $modalIcpTransaction && nonNullish(selectedTransaction)}
	<IcpTransactionModal transaction={selectedTransaction} />
{/if}
