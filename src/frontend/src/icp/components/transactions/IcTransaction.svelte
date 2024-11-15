<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';

	export let transaction: IcTransactionUi;
	export let token: Token;

	let type: IcTransactionType;
	let transactionTypeLabel: string | undefined;
	let value: bigint | undefined;
	let timestampNanoseconds: bigint | undefined;
	let incoming: boolean | undefined;

	$: ({
		type,
		typeLabel: transactionTypeLabel,
		value,
		timestamp: timestampNanoseconds,
		incoming
	} = transaction);

	let pending = false;
	$: pending = transaction?.status === 'pending';

	let status: TransactionStatus;
	$: status = pending ? 'pending' : 'confirmed';

	let amount: bigint | undefined;
	$: amount = !incoming && nonNullish(value) ? value * -1n : value;

	let timestamp: number | undefined;
	$: timestamp = nonNullish(timestampNanoseconds)
		? Number(timestampNanoseconds / NANO_SECONDS_IN_SECOND)
		: undefined;
</script>

<Transaction
	on:click={() => modalStore.openIcTransaction(transaction)}
	styleClass="block w-full border-0"
	amount={BigNumber.from(amount)}
	{type}
	{timestamp}
	{status}
	{token}
>
	<IcTransactionLabel label={transactionTypeLabel} fallback={type} />
</Transaction>
