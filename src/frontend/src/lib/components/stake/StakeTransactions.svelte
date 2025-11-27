<script lang="ts">
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import type {
		AnyTransactionUiWithToken,
		StakingTransactionsUiWithToken
	} from '$lib/types/transaction-ui';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		transactions: StakingTransactionsUiWithToken[];
	}

	const { transactions }: Props = $props();

	const getTimestamp = (timestampNanoseconds?: bigint | number) =>
		nonNullish(timestampNanoseconds)
			? Number(BigInt(timestampNanoseconds) / NANO_SECONDS_IN_SECOND)
			: undefined;

	const getTo = (transaction: StakingTransactionsUiWithToken): string | undefined => {
		return nonNullish(transaction.to) && transaction.to.length > 0
			? (transaction.to[0] as string)
			: nonNullish(transaction.to) && transaction.to.length === 0
				? (transaction.to as string)
				: undefined;
	};

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

	let expanded = $state(false);
</script>

<StakeContentSection>
	{#snippet title()}
		<h4>Activity</h4>
	{/snippet}
	{#snippet content()}
		{#each expanded ? transactions : transactions.slice(0, 5) as transaction}
			<Transaction
				type={transaction.type}
				token={transaction.token}
				status={getStatus(transaction)}
				iconType="token"
				timestamp={getTimestamp(transaction.timestamp)}
				from={transaction.from}
				to={getTo(transaction)}
				displayAmount={transaction.value}
			>
				{#if 'incoming' in transaction && transaction?.incoming}
					{#if transaction.isReward}
						Reward claimed
					{:else}
						Unstaked
					{/if}
				{:else}
					Staked
				{/if}
			</Transaction>
		{/each}

		<Button
			colorStyle="muted"
			fullWidth
			innerStyleClass="items-center"
			onclick={() => (expanded = !expanded)}
			paddingSmall
			styleClass="text-brand-primary hover:bg-transparent hover:text-brand-secondary"
			transparent
		>
			{expanded ? $i18n.core.text.less : $i18n.core.text.more}
			<IconExpand {expanded} />
		</Button>
	{/snippet}
</StakeContentSection>
