<script lang="ts">
	import { notEmptyString, type Token } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { hasIndexCanister, hasNoIndexCanister } from '$icp/validation/ic-token.validation';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	let enabledTokensWithoutCanister: Token[];
	let enabledTokensWithBrokenCanister: Token[];
	$: enabledTokensWithoutTransaction = $enabledNetworkTokens.filter(
		(token: TokenUi) => $icTransactionsStore?.[token.id] === null
	);
	$: enabledTokensWithoutCanister = enabledTokensWithoutTransaction.filter((token: IcToken) =>
		hasNoIndexCanister(token)
	);
	$: enabledTokensWithBrokenCanister = enabledTokensWithoutTransaction.filter((token: IcToken) =>
		hasIndexCanister(token)
	);

	let tokenListWithoutCanister: string;
	let tokenListWithBrokenCanister: string;
	$: tokenListWithoutCanister = enabledTokensWithoutCanister
		.map((token) => `$${token.symbol}`)
		.join(', ');
	$: tokenListWithBrokenCanister = enabledTokensWithBrokenCanister
		.map((token) => `$${token.symbol}`)
		.join(', ');
</script>

<div class="flex flex-col gap-5">
	<PageTitle>{$i18n.activity.text.title}</PageTitle>

	{#if $testnetsEnabled}
		<div>
			<NetworksSwitcher />
		</div>
	{/if}

	{#if notEmptyString(tokenListWithoutCanister)}
		<MessageBox level="light-warning" closableKey="oisy_ic_hide_transaction_no_canister">
			{replacePlaceholders($i18n.activity.warning.no_index_canister, {
				$token_list: tokenListWithoutCanister
			})}
		</MessageBox>
	{/if}

	{#if notEmptyString(tokenListWithBrokenCanister)}
		<MessageBox level="light-warning" closableKey="oisy_ic_hide_transaction_broken_canister">
			{replacePlaceholders($i18n.activity.warning.broken_index_canister, {
				$token_list: tokenListWithBrokenCanister
			})}
		</MessageBox>
	{/if}

	<MessageBox level="plain" closableKey="oisy_ic_hide_bitcoin_activity">
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
