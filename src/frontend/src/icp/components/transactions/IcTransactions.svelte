<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
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
	import IcTransactionsScroll from '$icp/components/transactions/IcTransactionsScroll.svelte';
	import IcTransactionsSkeletons from '$icp/components/transactions/IcTransactionsSkeletons.svelte';
	import {
		tokenAsIcToken,
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { hasIndexCanister } from '$icp/validation/ic-token.validation';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { modalIcToken, modalIcTokenData, modalIcTransaction } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';

	let ckEthereum: boolean;
	$: ckEthereum = $tokenCkEthLedger || $tokenCkErc20Ledger;

	let additionalListener:
		| typeof IcTransactionsBtcListeners
		| typeof IcTransactionsCkEthereumListeners
		| typeof IcTransactionsNoListener;
	$: additionalListener = $tokenCkBtcLedger
		? IcTransactionsBtcListeners
		: ckEthereum
			? IcTransactionsCkEthereumListeners
			: IcTransactionsNoListener;

	let selectedTransaction: IcTransactionUi | undefined;
	let selectedToken: OptionToken;
	$: ({ transaction: selectedTransaction, token: selectedToken } =
		mapTransactionModalData<IcTransactionUi>({
			$modalOpen: $modalIcTransaction,
			$modalStore
		}));

	let noTransactions = false;
	$: noTransactions = nonNullish($pageToken) && $icTransactionsStore?.[$pageToken.id] === null;

	let token: Token;
	$: token = $pageToken ?? ICP_TOKEN;
</script>

<Info />

<Header>
	{$i18n.transactions.text.title}

	{#snippet end()}
		{#if $tokenCkBtcLedger}
			<IcTransactionsBitcoinStatus />
		{:else if ckEthereum}
			<IcTransactionsEthereumStatus />
		{/if}
	{/snippet}
</Header>

<IcTransactionsSkeletons>
	<svelte:component
		this={additionalListener}
		ckEthereumNativeToken={$ckEthereumNativeToken}
		{token}
	>
		{#if $icTransactions.length > 0}
			<IcTransactionsScroll {token}>
				{#each $icTransactions as transaction, index (`${transaction.data.id}-${index}`)}
					<li in:slide={{ duration: transaction.data.status === 'pending' ? 250 : 0 }}>
						<IcTransaction {token} transaction={transaction.data} />
					</li>
				{/each}
			</IcTransactionsScroll>
		{/if}

		{#if noTransactions}
			<IcNoIndexPlaceholder
				placeholderType={hasIndexCanister($tokenAsIcToken) ? 'not-working' : 'missing'}
			/>
		{:else if $icTransactions.length === 0}
			<TransactionsPlaceholder />
		{/if}
	</svelte:component>
</IcTransactionsSkeletons>

{#if $modalIcTransaction && nonNullish(selectedTransaction)}
	<IcTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalIcToken}
	<IcTokenModal fromRoute={$modalIcTokenData} />
{/if}
