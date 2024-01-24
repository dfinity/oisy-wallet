<script lang="ts">
	import IcTransactionsSkeletons from './IcTransactionsSkeletons.svelte';
	import IcTransaction from './IcTransaction.svelte';
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { last } from '$lib/utils/array.utils';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { modalIcTransaction } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import IcpTransactionModal from './IcTransactionModal.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken, IcTransaction as IcTransactionType, IcTransactionUi } from '$icp/types/ic';
	import { token, tokenId } from '$lib/derived/token.derived';
	import { loadNextTransactions } from '$icp/services/ic-transactions.services';
	import type { CertifiedData } from '$lib/types/store';
	import ReceiveBitcoin from '$icp/components/receive/ReceiveBitcoin.svelte';
	import Info from '$icp/components/info/Info.svelte';

	let transactions: CertifiedData<IcTransactionType>[];
	$: transactions = $icTransactionsStore?.[$tokenId] ?? [];

	let disableInfiniteScroll = false;

	const onIntersect = async () => {
		if (isNullish($authStore.identity)) {
			toastsError({
				msg: { text: 'You are not signed-in.' }
			});
			return;
		}

		const lastId = last(transactions)?.data.id;

		if (isNullish(lastId)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		await loadNextTransactions({
			owner: $authStore.identity.getPrincipal(),
			identity: $authStore.identity,
			maxResults: WALLET_PAGINATION,
			start: lastId,
			token: $token as IcToken,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};

	let selectedTransaction: IcTransactionUi | undefined;
	$: selectedTransaction = $modalIcTransaction
		? ($modalStore?.data as IcTransactionUi | undefined)
		: undefined;
</script>

<Info />

<div class="flex justify-between mb-6 pb-1 items-center">
	<h2 class="text-base">Transactions</h2>

	<ReceiveBitcoin />
</div>

<IcTransactionsSkeletons>
	{#if transactions.length > 0}
		<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
			{#each transactions as transaction, index (`${transaction.data.id}-${index}`)}
				<li>
					<IcTransaction transaction={transaction.data} />
				</li>
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
