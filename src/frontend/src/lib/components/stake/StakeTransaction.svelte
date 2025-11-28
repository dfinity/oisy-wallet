<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { NANO_SECONDS_IN_SECOND, ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';

	interface Props {
		transaction: StakingTransactionsUiWithToken;
		onClick?: () => void;
		testId?: string;
	}
	const { transaction, onClick, testId }: Props = $props();

	const getTimestamp = (timestampNanoseconds?: bigint | number) =>
		nonNullish(timestampNanoseconds)
			? Number(BigInt(timestampNanoseconds) / NANO_SECONDS_IN_SECOND)
			: undefined;

	const getToAddress = (transaction: StakingTransactionsUiWithToken): string | undefined =>
		nonNullish(transaction.to)
			? transaction.to.length > 0
				? transaction.to[0]
				: (transaction.to as string)
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

	const incoming = $derived('incoming' in transaction && transaction.incoming);

	const getDisplayAmount = (transaction: StakingTransactionsUiWithToken) => {
		if (nonNullish(transaction.value)) {
			if (incoming && !transaction.isReward) {
				return (
					(transaction.value +
						('fee' in transaction && nonNullish(transaction.fee) ? transaction.fee : ZERO)) *
					-1n
				);
			}
			return transaction.value;
		}
	};

	const getLabel = (transaction: StakingTransactionsUiWithToken) =>
		incoming
			? transaction.isReward
				? $i18n.stake.text.reward_claimed
				: $i18n.stake.text.unstaked
			: $i18n.stake.text.staked;
</script>

<Transaction
	displayAmount={getDisplayAmount(transaction)}
	from={transaction.from}
	iconType="token"
	{onClick}
	status={getStatus(transaction)}
	timeOnly={false}
	timestamp={getTimestamp(transaction.timestamp)}
	to={getToAddress(transaction)}
	token={transaction.token}
	type={transaction.type}
	{testId}
>
	{getLabel(transaction)}
</Transaction>
