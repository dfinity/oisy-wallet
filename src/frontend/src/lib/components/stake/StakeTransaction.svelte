<script lang="ts">
	import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
	import { NANO_SECONDS_IN_SECOND, ZERO } from '$lib/constants/app.constants';
	import { nonNullish } from '@dfinity/utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		transaction: StakingTransactionsUiWithToken;
		onClick?: () => void;
	}
	const { transaction, onClick }: Props = $props();

	const getTimestamp = (timestampNanoseconds?: bigint | number) =>
		nonNullish(timestampNanoseconds)
			? Number(BigInt(timestampNanoseconds) / NANO_SECONDS_IN_SECOND)
			: undefined;

	const getToAddress = (transaction: StakingTransactionsUiWithToken): string | undefined =>
		nonNullish(transaction.to) && transaction.to.length > 0
			? (transaction.to[0] as string)
			: nonNullish(transaction.to) && transaction.to.length === 0
				? (transaction.to as string)
				: undefined;

	const getStatus = (transaction: StakingTransactionsUiWithToken) => {
		if ('status' in transaction && nonNullish(transaction.status)) {
			return transaction.status === 'confirmed' ||
				transaction.status === 'executed' ||
				transaction.status === 'finalized' ||
				transaction.status === 'processed'
				? 'confirmed'
				: transaction.status === 'pending'
					? 'pending'
					: 'unconfirmed';
		}
		return 'unconfirmed';
	};

	const getDisplayAmount = (transaction: StakingTransactionsUiWithToken) =>
		'incoming' in transaction &&
		transaction.incoming &&
		!transaction.isReward &&
		nonNullish(transaction.value)
			? (transaction.value +
					('fee' in transaction && nonNullish(transaction.fee) ? transaction.fee : ZERO)) *
				-1n
			: nonNullish(transaction.value)
				? transaction.value
				: undefined;

	const getLabel = (transaction: StakingTransactionsUiWithToken) =>
		'incoming' in transaction && transaction.incoming
			? transaction.isReward
				? $i18n.stake.text.reward_claimed
				: $i18n.stake.text.unstaked
			: $i18n.stake.text.staked;
</script>

<Transaction
	type={transaction.type}
	token={transaction.token}
	status={getStatus(transaction)}
	iconType="token"
	timestamp={getTimestamp(transaction.timestamp)}
	from={transaction.from}
	to={getToAddress(transaction)}
	displayAmount={getDisplayAmount(transaction)}
	{onClick}
	timeOnly={false}
>
	{getLabel(transaction)}
</Transaction>
