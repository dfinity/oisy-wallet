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

	interface Props {
		transactions: StakingTransactionsUiWithToken[];
	}

	const { transactions }: Props = $props();

	const getTimestamp = (timestampNanoseconds?: bigint) =>
		nonNullish(timestampNanoseconds)
			? Number(timestampNanoseconds / NANO_SECONDS_IN_SECOND)
			: undefined;
</script>

<StakeContentSection>
	{#snippet title()}
		Activity
	{/snippet}
	{#snippet content()}
		{#each transactions as transaction}
			{#if 'status' in transaction && transaction.status === 'confirmed'}
				<Transaction
					type={transaction.type}
					token={transaction.token}
					status={'confirmed'}
					iconType="token"
					timestamp={getTimestamp(transaction.timestamp)}
					from={transaction.from}
					to={(nonNullish(transaction.to) && transaction.to.length > 0
						? transaction.to[0]
						: transaction.to) as string | undefined}
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
			{/if}
		{/each}
	{/snippet}
</StakeContentSection>
