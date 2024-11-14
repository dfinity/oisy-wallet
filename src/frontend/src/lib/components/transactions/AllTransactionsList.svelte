<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import {
		modalBtcTransaction,
		modalIcTransaction,
		modalEthTransaction
	} from '$lib/derived/modal.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionsUi;
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore
	});

	let selectedBtcTransaction: BtcTransactionUi | undefined;
	$: selectedBtcTransaction = $modalBtcTransaction
		? ($modalStore?.data as BtcTransactionUi | undefined)
		: undefined;

	let selectedEthTransaction: EthTransactionUi | undefined;
	$: selectedEthTransaction = $modalEthTransaction
		? ($modalStore?.data as EthTransactionUi | undefined)
		: undefined;

	let selectedIcTransaction: IcTransactionUi | undefined;
	$: selectedIcTransaction = $modalIcTransaction
		? ($modalStore?.data as IcTransactionUi | undefined)
		: undefined;
</script>

<!--TODO: include skeleton for loading transactions and remove nullish checks-->
{#if nonNullish(transactions) && transactions.length > 0}
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<div in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.component} {transaction} />
		</div>
	{/each}
{/if}

{#if isNullish(transactions) || transactions.length === 0}
	<TransactionsPlaceholder />
{/if}

{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
	<BtcTransactionModal transaction={selectedBtcTransaction} />
{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
	<EthTransactionModal transaction={selectedEthTransaction} />
{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
	<IcTransactionModal transaction={selectedIcTransaction} />
{/if}
