<script lang="ts">
	import { slide } from 'svelte/transition';
	import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdEthereum,
		isNetworkIdICP
	} from '$lib/utils/network.utils';

	let transactions: AllTransactionsUi;
	// TODO: extract the function to a separate util
	$: transactions = $enabledTokens.reduce<AllTransactionsUi>(
		(acc, { network: { id: networkId } }) => {
			if (isNetworkIdBTCMainnet(networkId)) {
				// TODO: Implement BTC transactions
			}

			if (isNetworkIdICP(networkId)) {
				// TODO: Implement ICP transactions
				return acc;
			}

			if (isNetworkIdEthereum(networkId)) {
				// TODO: Implement Ethereum transactions
				return acc;
			}

			return acc;
		},
		[]
	);
</script>

<AllTransactionsSkeletons>
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<li in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.transactionComponent} {transaction} />
		</li>
	{/each}

	{#if transactions.length === 0}
		<TransactionsPlaceholder />
	{/if}
</AllTransactionsSkeletons>
