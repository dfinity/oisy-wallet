<script lang="ts">
	import { slide } from 'svelte/transition';
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

<!--TODO: include skeleton for loading transactions-->

{#if transactions.length > 0}
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<li in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.transactionComponent} {transaction} />
		</li>
	{/each}
{/if}

{#if transactions.length === 0}
	<TransactionsPlaceholder />
{/if}
