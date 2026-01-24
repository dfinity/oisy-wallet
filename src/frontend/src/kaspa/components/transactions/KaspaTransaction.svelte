<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { KaspaTransactionUi } from '$kaspa/types/kaspa-transaction';

	interface Props {
		transaction: KaspaTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { type, value, timestamp, status, to, from } = $derived(transaction);

	let label = $derived(type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive);

	// Kaspa transactions can have multiple recipients - display first one
	let toAddress = $derived(to?.[0]);

	let transactionStatus: TransactionStatus = $derived(status === 'pending' ? 'pending' : 'confirmed');

	let displayAmount = $derived(nonNullish(value) ? (type === 'send' ? value * -1n : value) : value);

	const modalId = Symbol();
</script>

<Transaction
	{displayAmount}
	{from}
	{iconType}
	onClick={() => modalStore.openKaspaTransaction({ id: modalId, data: { transaction, token } })}
	status={transactionStatus}
	timestamp={nonNullish(timestamp) ? Number(timestamp) : timestamp}
	to={toAddress}
	{token}
	{type}
>
	{label}
</Transaction>
