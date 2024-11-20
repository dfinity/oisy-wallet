<script lang="ts">
	import { sortedBtcTransactions } from '$btc/derived/btc-transactions.derived';
	import { sortedEthTransactions } from '$eth/derived/eth-transactions.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	let tokensWithoutCanister: TokenUi[];
	$: tokensWithoutCanister = $combinedDerivedSortedNetworkTokensUi
		.filter(
			({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || $showZeroBalances
		)
		.filter(
			(token) =>
				$sortedEthTransactions?.[token.id] === null ||
				$sortedBtcTransactions?.[token.id] === null ||
				$icTransactionsStore?.[token.id] === null
		);

	let tokenList: string;
	$: tokenList = tokensWithoutCanister.map((token) => `$${token.symbol}`).join(', ');
</script>

<div class="flex flex-col gap-5">
	<PageTitle>{$i18n.activity.text.title}</PageTitle>

	{#if tokenList}
		<MessageBox level="light-warning" closable>
			{replacePlaceholders($i18n.activity.warning.incomplete_transaction_list, {
				$token_list: tokenList
			})}
		</MessageBox>
	{/if}

	<MessageBox level="plain" closable>
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
