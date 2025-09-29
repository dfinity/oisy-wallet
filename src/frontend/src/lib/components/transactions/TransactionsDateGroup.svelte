<script lang="ts">
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import type { AllTransactionUiWithCmpNonEmptyList } from '$lib/types/transaction';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';

	interface Props {
		formattedDate: string;
		transactions: AllTransactionUiWithCmpNonEmptyList;
		testId?: string;
	}

	let { formattedDate, transactions, testId }: Props = $props();
</script>

{#if transactions.length > 0}
	<div class="mb-5 flex flex-col gap-3" data-tid={testId}>
		<span class="text-lg font-medium text-tertiary first-letter:capitalize">{formattedDate}</span>

		{#each transactions as transactionUi, index (`${transactionUi.transaction.id}-${index}`)}
			{@const { component, token, transaction } = transactionUi}

			<div in:slide={SLIDE_DURATION}>
				{#if component === 'bitcoin'}
					<BtcTransaction iconType="token" {token} {transaction} />
				{:else if component === 'ethereum'}
					<EthTransaction iconType="token" {token} {transaction} />
				{:else if component === 'solana'}
					<SolTransaction iconType="token" {token} {transaction} />
				{:else}
					<IcTransaction iconType="token" {token} {transaction} />
				{/if}
			</div>
		{/each}
	</div>
{/if}
