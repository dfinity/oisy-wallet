<script lang="ts">
	import type { Token } from '@dfinity/utils';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { enabledNetworkTokensWithoutIndexCanister } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	let tokensWithoutCanister: Token[];
	$: tokensWithoutCanister = $enabledNetworkTokensWithoutIndexCanister;

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
