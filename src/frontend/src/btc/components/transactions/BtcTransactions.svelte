<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
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
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		modalBtcToken,
		modalBtcTokenData,
		modalBtcTransaction
	} from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';

	let selectedTransaction = $state<BtcTransactionUi | undefined>();
	let selectedToken = $state<OptionToken>();
	$effect(() => {
		({ transaction: selectedTransaction, token: selectedToken } =
			mapTransactionModalData<BtcTransactionUi>({
				$modalOpen: $modalBtcTransaction,
				$modalStore
			}));
	});

	let token = $derived($pageToken ?? DEFAULT_BITCOIN_TOKEN);
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
