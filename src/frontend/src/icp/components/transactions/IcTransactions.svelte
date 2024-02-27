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
	import type { IcToken, IcTransactionUi } from '$icp/types/ic';
	import { token } from '$lib/derived/token.derived';
	import { loadNextTransactions } from '$icp/services/ic-transactions.services';
	import IcReceiveBitcoin from '$icp/components/receive/IcReceiveBitcoin.svelte';
	import Info from '$icp/components/info/Info.svelte';
	import { WALLET_PAGINATION } from '$icp/constants/ic.constants';
	import type { ComponentType } from 'svelte';
	import { tokenCkBtcLedger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import IcTransactionsBtcListeners from '$icp/components/transactions/IcTransactionsCkBTCListeners.svelte';
	import IcTransactionsNoListener from '$icp/components/transactions/IcTransactionsNoListener.svelte';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { slide } from 'svelte/transition';
	import IcTransactionsCkETHListeners from '$icp/components/transactions/IcTransactionsCkETHListeners.svelte';

	let additionalListener: ComponentType;
	$: additionalListener = $tokenCkBtcLedger
		? IcTransactionsBtcListeners
		: $tokenCkEthLedger
			? IcTransactionsCkETHListeners
			: IcTransactionsNoListener;

	let disableInfiniteScroll = false;

	const onIntersect = async () => {
		if (isNullish($authStore.identity)) {
			toastsError({
				msg: { text: 'You are not signed-in.' }
			});
			return;
		}

		const lastId = last($icTransactions)?.data.id;

		if (isNullish(lastId)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		if (typeof lastId !== 'bigint') {
			// Pseudo transactions are displayed at the end of the list. There is not such use case in Oisy.
			// Additionally, if it would be the case, that would mean that we display pseudo transactions at the end of the list and therefore we could assume all valid transactions have been fetched
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

	<IcReceiveBitcoin />
</div>

<IcTransactionsSkeletons>
	<svelte:component this={additionalListener}>
		{#if $icTransactions.length > 0}
			<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
				{#each $icTransactions as transaction, index (`${transaction.data.id}-${index}`)}
					<li in:slide={{ duration: transaction.data.status === 'pending' ? 250 : 0 }}>
						<IcTransaction transaction={transaction.data} />
					</li>
				{/each}
			</InfiniteScroll>
		{/if}

		{#if $icTransactions.length === 0}
			<p class="mt-4 text-dark opacity-50">You have no transactions.</p>
		{/if}
	</svelte:component>
</IcTransactionsSkeletons>

{#if $modalIcTransaction && nonNullish(selectedTransaction)}
	<IcpTransactionModal transaction={selectedTransaction} />
{/if}
