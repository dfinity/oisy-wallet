<script lang="ts">
	import { slide } from 'svelte/transition';
	import { capitalizeFirstLetter } from '../../../tests/utils/string-utils';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
	import KaspaTransaction from '$kaspa/components/transactions/KaspaTransaction.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import type { AllTransactionUiWithCmpNonEmptyList } from '$lib/types/transaction-ui';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';

	interface Props {
		formattedDate: string;
		transactions: AllTransactionUiWithCmpNonEmptyList;
		testId?: string;
	}

	let { formattedDate, transactions, testId }: Props = $props();

	let capitalizedFormattedDate = $derived(capitalizeFirstLetter(formattedDate));
</script>

{#if transactions.length > 0}
	<div class="mb-5 flex flex-col gap-3" data-tid={testId}>
		<StickyHeader>
			{#snippet header()}
				<span class="mb-3 flex text-lg font-medium text-tertiary">{capitalizedFormattedDate}</span>
			{/snippet}

			{#each transactions as transactionUi, index (`${transactionUi.transaction.id}-${transactionUi.token.id.description}-${index}`)}
				{@const { component, token, transaction } = transactionUi}

				<div in:slide={SLIDE_DURATION}>
					{#if component === 'bitcoin'}
						<BtcTransaction iconType="token" {token} {transaction} />
					{:else if component === 'ethereum'}
						<EthTransaction iconType="token" {token} {transaction} />
					{:else if component === 'solana'}
						<SolTransaction iconType="token" {token} {transaction} />
					{:else if component === 'kaspa'}
						<KaspaTransaction iconType="token" {token} {transaction} />
					{:else}
						<IcTransaction iconType="token" {token} {transaction} />
					{/if}
				</div>
			{/each}
		</StickyHeader>
	</div>
{/if}
