<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import type { BtcTransactionType } from '$btc/types/btc-transaction';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	export let transaction: BtcTransactionUi;
	export let token: Token;
	export let iconType: 'token' | 'transaction' = 'transaction';

	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let status: BtcTransactionStatus;
	let type: BtcTransactionType;

	$: ({ type, status, value, timestamp } = transaction);

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;

	let amount: bigint | undefined;
	$: amount = nonNullish(value) ? (type === 'send' ? value * -1n : value) : undefined;
</script>

<Transaction
	on:click={() => modalStore.openBtcTransaction({ transaction, token })}
	{amount}
	{type}
	timestamp={Number(timestamp)}
	{status}
	{token}
	{iconType}
>
	{label}
</Transaction>
