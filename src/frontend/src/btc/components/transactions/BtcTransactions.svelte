<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import BtcTokenModal from '$btc/components/tokens/BtcTokenModal.svelte';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import BtcTransactionsHeader from '$btc/components/transactions/BtcTransactionsHeader.svelte';
	import {
		sortedBtcTransactions,
		btcTransactionsNotInitialized
	} from '$btc/derived/btc-transactions.derived';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { DEFAULT_BITCOIN_TOKEN } from '$lib/constants/tokens.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		modalBtcToken,
		modalBtcTokenData,
		modalBtcTransaction
	} from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';

	let selectedTransaction: BtcTransactionUi | undefined;
	let selectedToken: OptionToken;
	$: ({ transaction: selectedTransaction, token: selectedToken } =
		mapTransactionModalData<BtcTransactionUi>({
			$modalOpen: $modalBtcTransaction,
			$modalStore
		}));

	let token: Token;
	$: token = $pageToken ?? DEFAULT_BITCOIN_TOKEN;
</script>

<BtcTransactionsHeader />

<TransactionsSkeletons loading={$btcTransactionsNotInitialized}>
	{#each $sortedBtcTransactions as transaction (transaction.data.id)}
		<div transition:slide={SLIDE_DURATION}>
			<BtcTransaction {token} transaction={transaction.data} />
		</div>
	{/each}

	{#if $sortedBtcTransactions.length === 0}
		<TransactionsPlaceholder />
	{/if}
</TransactionsSkeletons>

{#if $modalBtcTransaction && nonNullish(selectedTransaction)}
	<BtcTransactionModal token={selectedToken} transaction={selectedTransaction} />
{:else if $modalBtcToken}
	<BtcTokenModal fromRoute={$modalBtcTokenData} />
{/if}
