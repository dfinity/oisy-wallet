<script lang="ts">
	import IcTransactionsSkeletons from '$lib/components/transactions/ic/IcTransactionsSkeletons.svelte';
	import IcTransaction from '$lib/components/transactions/ic/IcTransaction.svelte';
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { last } from '$lib/utils/array.utils';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { modalIcTransaction } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import IcpTransactionModal from '$lib/components/transactions/ic/IcTransactionModal.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { icTransactionsStore } from '$lib/stores/ic-transactions.store';
	import type { IcToken, IcTransaction as IcTransactionType, IcTransactionUi } from '$lib/types/ic';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { getTransactions } from '$lib/services/ic-transactions.services';

	let transactions: IcTransactionType[];
	$: transactions = $icTransactionsStore[$tokenId] ?? [];

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
				start: lastId,
				token: $token as IcToken
			});

			if (nextTransactions.length === 0) {
				disableInfiniteScroll = true;
				return;
			}

			icTransactionsStore.append({ tokenId: $tokenId, transactions: nextTransactions });
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Something went wrong while fetching the transactions.' },
				err
			});

			disableInfiniteScroll = true;
		}
	};

	let selectedTransaction: IcTransactionUi | undefined;
	$: selectedTransaction = $modalIcTransaction
		? ($modalStore?.data as IcTransactionUi | undefined)
		: undefined;
</script>

<IcTransactionsSkeletons>
	{#if transactions.length > 0}
		<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
			{#each transactions as transaction, index (`${transaction.id}-${index}`)}
				<IcTransaction {transaction} />
			{/each}
		</InfiniteScroll>
	{/if}

	{#if transactions.length === 0}
		<p class="mt-4 text-dark opacity-50">You have no transactions.</p>
	{/if}
</IcTransactionsSkeletons>

{#if $modalIcTransaction && nonNullish(selectedTransaction)}
	<IcpTransactionModal transaction={selectedTransaction} />
{/if}
