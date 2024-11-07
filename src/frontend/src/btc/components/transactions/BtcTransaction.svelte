<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TransactionType } from '$lib/types/transaction';

	export let transaction: BtcTransactionUi;

	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let status: BtcTransactionStatus;
	let type: TransactionType;

	$: ({ type, status, value, timestamp } = transaction);

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;
</script>

<Transaction
	on:click={() => modalStore.openBtcTransaction(transaction)}
	amount={nonNullish(value) ? BigNumber.from(value) : undefined}
	{type}
	timestamp={Number(timestamp)}
	{status}
>
	{label}
</Transaction>
