<script lang="ts">
	import { slide } from 'svelte/transition';
	import { capitalizeFirstLetter } from '../../../tests/utils/string-utils';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import { SOL_TRANSACTION_GROUPING_ENABLED } from '$env/sol-transaction-grouping.env';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import type { AllTransactionUiWithCmpNonEmptyList } from '$lib/types/transaction-ui';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
	import SolTransactionsGroup from '$sol/components/transactions/SolTransactionsGroup.svelte';
	import { groupSolTransactionsBySignature } from '$sol/utils/sol-transaction-group.utils';

	interface Props {
		formattedDate: string;
		transactions: AllTransactionUiWithCmpNonEmptyList;
		testId?: string;
	}

	let { formattedDate, transactions, testId }: Props = $props();

	let capitalizedFormattedDate = $derived(capitalizeFirstLetter(formattedDate));

	// Rows of other chains pass through untouched, and a Solana signature with a single row stays a
	// plain row, so this list is the same one as before wherever nothing was split.
	let entries = $derived(
		SOL_TRANSACTION_GROUPING_ENABLED
			? groupSolTransactionsBySignature(transactions)
			: transactions.map((transaction) => ({ kind: 'transaction' as const, transaction }))
	);
</script>

{#if transactions.length > 0}
	<div class="mb-5 flex flex-col gap-3" data-tid={testId}>
		<StickyHeader>
			{#snippet header()}
				<span class="mb-3 flex text-lg font-medium text-tertiary">{capitalizedFormattedDate}</span>
			{/snippet}

			{#each entries as entry, index (entry.kind === 'group' ? `group-${entry.group.signature}` : `${entry.transaction.transaction.id}-${entry.transaction.token.id.description}-${index}`)}
				<div in:slide={SLIDE_DURATION}>
					{#if entry.kind === 'group'}
						<SolTransactionsGroup group={entry.group} />
					{:else}
						{@const { component, token, transaction } = entry.transaction}

						{#if component === 'bitcoin'}
							<BtcTransaction iconType="token" {token} {transaction} />
						{:else if component === 'ethereum'}
							<EthTransaction iconType="token" {token} {transaction} />
						{:else if component === 'solana'}
							<SolTransaction iconType="token" {token} {transaction} />
						{:else}
							<IcTransaction iconType="token" {token} {transaction} />
						{/if}
					{/if}
				</div>
			{/each}
		</StickyHeader>
	</div>
{/if}
