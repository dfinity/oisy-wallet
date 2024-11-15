<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionsUi;
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore,
		$ethTransactions: $ethTransactionsStore,
		$ckEthMinterInfo: $ckEthMinterInfoStore,
		$ethAddress: $ethAddress
	});
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

<!--TODO: add modals for transaction details-->
