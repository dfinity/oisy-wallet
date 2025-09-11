<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Commitment } from '@solana/kit';
	import { run } from 'svelte/legacy';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	interface Props {
		transaction: SolTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { type, value, timestamp, status, to, from, toOwner, fromOwner } = $derived(transaction);

	let label = $derived(type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive);

	let pending = $derived(status === 'processed' || isNullish(status));

	let transactionStatus: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	let amount = $derived(nonNullish(value) ? (type === 'send' ? value * -1n : value) : value);

	const modalId = Symbol();
</script>

<Transaction
	{amount}
	from={fromOwner ?? from}
	{iconType}
	onClick={() => modalStore.openSolTransaction({ id: modalId, data: { transaction, token } })}
	status={transactionStatus}
	timestamp={nonNullish(timestamp) ? Number(timestamp) : timestamp}
	to={toOwner ?? to}
	{token}
	{type}
>
	{label}
</Transaction>
