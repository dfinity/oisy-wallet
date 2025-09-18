<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { run } from 'svelte/legacy';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';

	interface Props {
		transaction: IcTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let {
		type,
		typeLabel: transactionTypeLabel,
		value,
		timestamp: timestampNanoseconds,
		incoming,
		to,
		from
	} = $derived(transaction);

	let pending = $derived(transaction?.status === 'pending');

	let status: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	let amount = $derived(nonNullish(value) ? (incoming ? value : value * -1n) : value);

	let timestamp = $derived(
		nonNullish(timestampNanoseconds)
			? Number(timestampNanoseconds / NANO_SECONDS_IN_SECOND)
			: undefined
	);

	const modalId = Symbol();
</script>

<Transaction
	{amount}
	{from}
	{iconType}
	onClick={() => modalStore.openIcTransaction({ id: modalId, data: { transaction, token } })}
	{status}
	styleClass="block w-full border-0"
	{timestamp}
	{to}
	{token}
	{type}
>
	<IcTransactionLabel fallback={type} label={transactionTypeLabel} {token} />
</Transaction>
