<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { SolTransactionType, SolTransactionUi } from '$sol/types/sol-transaction';

	export let transaction: SolTransactionUi;
	export let token: Token;
	export let iconType: 'token' | 'transaction' = 'transaction';

	let type: SolTransactionType;
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

<!--TODO: add transaction modal opening-->
<Transaction
	styleClass="block w-full border-0"
	amount={BigNumber.from(amount)}
	{type}
	{timestamp}
	{status}
	{token}
	{iconType}
>
	{label}
</Transaction>
