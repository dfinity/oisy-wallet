<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { SolTransactionType, SolTransactionUi } from '$sol/types/sol-transaction';

	export let transaction: SolTransactionUi;
	export let token: Token;
	export let iconType: 'token' | 'transaction' = 'transaction';

	let type: SolTransactionType;
	let value: bigint | undefined;
	let timestamp: bigint | undefined;

	$: ({ type, value, timestamp } = transaction);

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;

	let pending = false;

	let status: TransactionStatus;
	$: status = pending ? 'pending' : 'confirmed';

	let amount: bigint | undefined;
	$: amount = nonNullish(value) ? value * -1n : value;
</script>

<!--TODO: add transaction modal opening-->
<Transaction
	styleClass="block w-full border-0"
	amount={nonNullish(amount) ? BigNumber.from(amount) : amount}
	{type}
	timestamp={nonNullish(timestamp) ? Number(timestamp) : timestamp}
	{status}
	{token}
	{iconType}
>
	{label}
</Transaction>
