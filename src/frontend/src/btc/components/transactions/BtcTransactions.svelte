<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import BtcTransactionsHeader from '$btc/components/transactions/BtcTransactionsHeader.svelte';
	import {
		sortedBtcTransactions,
		btcTransactionsNotInitialized
	} from '$btc/derived/btc-transactions.derived';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { modalBtcTransaction } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let selectedTransaction: BtcTransactionUi | undefined;
	$: selectedTransaction = $modalBtcTransaction
		? ($modalStore?.data as BtcTransactionUi | undefined)
		: undefined;
</script>

<BtcTransactionsHeader />

<TokensSkeletons loading={$btcTransactionsNotInitialized}>
	{#each $sortedBtcTransactions as transaction (transaction.data.id)}
		<div transition:slide={SLIDE_DURATION}>
			<BtcTransaction transaction={transaction.data} />
		</div>
	{/each}

	{#if $sortedBtcTransactions.length === 0}
		<p class="text-secondary mt-4 opacity-50">{$i18n.transactions.text.no_transactions}</p>
	{/if}
</TokensSkeletons>

{#if $modalBtcTransaction && nonNullish(selectedTransaction)}
	<BtcTransactionModal transaction={selectedTransaction} />
{/if}
