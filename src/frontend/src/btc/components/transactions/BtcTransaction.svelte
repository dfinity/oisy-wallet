<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TransactionType } from '$lib/types/transaction';

	export let transaction: BtcTransactionUi;

	let value: bigint | undefined;
	let timestamp: number | undefined;
	let status: BtcTransactionStatus;
	let type: TransactionType;

	$: ({ type, status, value, timestamp } = transaction);

	let pending: boolean;
	$: pending = status === 'pending';
</script>

<Transaction
	on:click={() => modalStore.openBtcTransaction(transaction)}
	value={nonNullish(value) ? BigNumber.from(value) : undefined}
	{type}
	{timestamp}
	{pending}
/>
