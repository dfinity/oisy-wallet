<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';

	interface Props {
		transaction: StakingTransactionsUiWithToken;
		onClick?: () => void;
		testId?: string;
	}
	const { transaction, onClick, testId }: Props = $props();

	let isHarvestAutopilot = $derived(isTokenHarvestAutopilot(transaction.token));

	let {
		token,
		type,
		value,
		from,
		to: unparsedTo,
		timestamp: unparsedTimestamp
	} = $derived(transaction);

	let pending = $derived(
		isHarvestAutopilot ? isTransactionPending(transaction as EthTransactionUi) : false
	);

	let status: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	let incoming = $derived(type === 'receive');

	let displayAmount = $derived((value ?? ZERO) * (incoming ? 1n : -1n));

	let label = $derived(
		!isHarvestAutopilot
			? incoming
				? $i18n.stake.text.staked
				: $i18n.stake.text.unstaked
			: incoming
				? $i18n.receive.text.receive
				: $i18n.send.text.send
	);

	let to = $derived(
		nonNullish(unparsedTo) ? (Array.isArray(unparsedTo) ? unparsedTo[0] : unparsedTo) : undefined
	);

	let timestamp = $derived(nonNullish(unparsedTimestamp) ? Number(unparsedTimestamp) : undefined);
</script>

<Transaction
	{displayAmount}
	{from}
	iconType="token"
	{onClick}
	{status}
	{testId}
	timeOnly={false}
	{timestamp}
	{to}
	{token}
	{type}
>
	{label}
</Transaction>
