<script lang="ts">
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import type { AllTransactionUiWithCmpNonEmptyList } from '$lib/types/transaction';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';

	export let formattedDate: string;
	export let transactions: AllTransactionUiWithCmpNonEmptyList;
	export let testId: string | undefined = undefined;
</script>

{#if transactions.length > 0}
	<div class="mb-5 flex flex-col gap-3" data-tid={testId}>
		<span class="text-lg font-medium text-tertiary first-letter:capitalize">{formattedDate}</span>

		{#each transactions as transactionUi, index (`${transactionUi.transaction.id}-${index}`)}
			{@const { component, token, transaction } = transactionUi}

			<div in:slide={SLIDE_DURATION}>
				{#if component === 'bitcoin'}
					<BtcTransaction {transaction} {token} iconType="token" />
				{:else if component === 'ethereum'}
					<EthTransaction {transaction} {token} iconType="token" />
				{:else if component === 'solana'}
					<SolTransaction {transaction} {token} iconType="token" />
				{:else}
					<IcTransaction {transaction} {token} iconType="token" />
				{/if}
			</div>
		{/each}
	</div>
{/if}
