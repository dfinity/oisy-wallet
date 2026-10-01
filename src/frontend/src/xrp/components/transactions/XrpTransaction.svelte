<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';

	interface Props {
		transaction: XrpTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { type, value, timestamp, status, to, from } = $derived(transaction);

	let label = $derived(type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive);

	let displayAmount = $derived(nonNullish(value) ? (type === 'send' ? value * -1n : value) : value);

	const modalId = Symbol();
</script>

<Transaction
	{displayAmount}
	{from}
	{iconType}
	onClick={() => modalStore.openXrpTransaction({ id: modalId, data: { transaction, token } })}
	{status}
	timestamp={nonNullish(timestamp) ? Number(timestamp) : timestamp}
	{to}
	{token}
	{type}
>
	{label}
</Transaction>
