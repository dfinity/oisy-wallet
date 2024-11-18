<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { ComponentType } from 'svelte';
	import { slide } from 'svelte/transition';
	import { ICP_TOKEN } from '$env/tokens.env';
	import Info from '$icp/components/info/Info.svelte';
	import IcTokenModal from '$icp/components/tokens/IcTokenModal.svelte';
	import IcNoIndexPlaceholder from '$icp/components/transactions/IcNoIndexPlaceholder.svelte';
	import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import IcTransactionsBitcoinStatus from '$icp/components/transactions/IcTransactionsBitcoinStatusBalance.svelte';
	import IcTransactionsBtcListeners from '$icp/components/transactions/IcTransactionsCkBTCListeners.svelte';
	import IcTransactionsCkEthereumListeners from '$icp/components/transactions/IcTransactionsCkEthereumListeners.svelte';
	import IcTransactionsEthereumStatus from '$icp/components/transactions/IcTransactionsEthereumStatus.svelte';
	import IcTransactionsNoListener from '$icp/components/transactions/IcTransactionsNoListener.svelte';
	import IcTransactionsSkeletons from '$icp/components/transactions/IcTransactionsSkeletons.svelte';
	import {
		tokenAsIcToken,
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { loadNextTransactions } from '$icp/services/ic-transactions.services';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { isNotIcToken, isNotIcTokenCanistersStrict } from '$icp/validation/ic-token.validation';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalIcToken, modalIcTransaction } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import { last } from '$lib/utils/array.utils';

	let ckEthereum: boolean;
	$: ckEthereum = $tokenCkEthLedger || $tokenCkErc20Ledger;

	let additionalListener: ComponentType;
	$: additionalListener = $tokenCkBtcLedger
		? IcTransactionsBtcListeners
		: ckEthereum
			? IcTransactionsCkEthereumListeners
			: IcTransactionsNoListener;

	let disableInfiniteScroll = false;

	const onIntersect = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
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

		if (isNullish($token)) {
			// Prevent unlikely events. UI wise if we are about to load the next transactions, it's probably because transactions for a loaded token have been fetched.
			return;
		}

		if (isNotIcToken($tokenAsIcToken) || isNotIcTokenCanistersStrict($tokenAsIcToken)) {
			// On one hand, we assume that the parent component does not mount this component if no transactions can be fetched; on the other hand, we want to avoid displaying an error toast that could potentially appear multiple times.
			// Therefore, we do not particularly display a visual error. In any case, we cannot load transactions without an Index canister.
			return;
		}

		await loadNextTransactions({
			owner: $authIdentity.getPrincipal(),
			identity: $authIdentity,
			maxResults: WALLET_PAGINATION,
			start: lastId,
			token: $tokenAsIcToken,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};

	let selectedTransaction: IcTransactionUi | undefined;
	$: selectedTransaction = $modalIcTransaction
		? ($modalStore?.data as IcTransactionUi | undefined)
		: undefined;

	let noTransactions = false;
	$: noTransactions = nonNullish($token) && $icTransactionsStore?.[$token.id] === null;
</script>

<Info />

<Header>
	{$i18n.transactions.text.title}

	<svelte:fragment slot="end">
		{#if $tokenCkBtcLedger}
			<IcTransactionsBitcoinStatus />
		{:else if ckEthereum}
			<IcTransactionsEthereumStatus />
		{/if}
	</svelte:fragment>
</Header>

<IcTransactionsSkeletons>
	<svelte:component this={additionalListener}>
		{#if $icTransactions.length > 0}
			<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
				{#each $icTransactions as transaction, index (`${transaction.data.id}-${index}`)}
					<li in:slide={{ duration: transaction.data.status === 'pending' ? 250 : 0 }}>
						<IcTransaction transaction={transaction.data} token={$token ?? ICP_TOKEN} />
					</li>
				{/each}
			</InfiniteScroll>
		{/if}

		{#if noTransactions}
			<IcNoIndexPlaceholder />
		{:else if $icTransactions.length === 0}
			<TransactionsPlaceholder />
		{/if}
	</svelte:component>
</IcTransactionsSkeletons>

{#if $modalIcTransaction && nonNullish(selectedTransaction)}
	<IcTransactionModal transaction={selectedTransaction} />
{:else if $modalIcToken}
	<IcTokenModal />
{/if}
