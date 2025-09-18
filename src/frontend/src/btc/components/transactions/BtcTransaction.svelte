<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
	import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
	import type { BtcTransactionType } from '$btc/types/btc-transaction';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		transaction: BtcTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { type, status, value, timestamp, to, from } = $derived(transaction);

	let label = $derived(type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive);

	let amount = $derived(nonNullish(value) ? (type === 'send' ? value * -1n : value) : undefined);

	const modalId = Symbol();
</script>

<Transaction
	{amount}
	{from}
	{iconType}
	onClick={() => modalStore.openBtcTransaction({ id: modalId, data: { transaction, token } })}
	{status}
	timestamp={Number(timestamp)}
	to={nonNullish(to?.[0]) ? to[0] : undefined}
	{token}
	{type}
>
	{label}
</Transaction>
