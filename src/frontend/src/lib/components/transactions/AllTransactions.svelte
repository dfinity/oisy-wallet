<script lang="ts">
	import type { Token } from '@dfinity/utils';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';

	let enabledTokensWithoutCanister: Token[];
	$: enabledTokensWithoutCanister = $enabledNetworkTokens.filter((token: Token) =>
		$btcTransactionsStore?.[token.id] === null ||
		$ethTransactionsStore?.[token.id] === null ||
		$icTransactionsStore?.[token.id] === null);

	let tokenList: string;
	$: tokenList = enabledTokensWithoutCanister.map((token) => `$${token.symbol}`).join(', ');
</script>

<div class="flex flex-col gap-5">
	<PageTitle>{$i18n.activity.text.title}</PageTitle>

	{#if tokenList}
		<MessageBox level="light-warning" closableKey="oisy_ic_hide_incomplete_transaction_list">
			{replacePlaceholders($i18n.activity.warning.incomplete_transaction_list, {
				$token_list: tokenList
			})}
		</MessageBox>
	{/if}

	<MessageBox level="plain" closableKey="oisy_ic_hide_bitcoin_activity">
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
