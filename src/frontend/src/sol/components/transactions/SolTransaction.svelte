<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Commitment } from '@solana/kit';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { SolTransactionType, SolTransactionUi } from '$sol/types/sol-transaction';

	export let transaction: SolTransactionUi;
	export let token: Token;
	export let iconType: 'token' | 'transaction' = 'transaction';

	let type: SolTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;
	let status: Commitment | null;
	let to: string | undefined;
	let from: string | undefined;
	let toOwner: string | undefined;
	let fromOwner: string | undefined;

	$: ({ type, value, timestamp, status, to, from, toOwner, fromOwner } = transaction);

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;

	let pending: boolean;
	$: pending = status === 'processed' || isNullish(status);

	let transactionStatus: TransactionStatus;
	$: transactionStatus = pending ? 'pending' : 'confirmed';

	let amount: bigint | undefined;
	$: amount = nonNullish(value) ? (type === 'send' ? value * -1n : value) : value;

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
