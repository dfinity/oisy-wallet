<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { hasNoIndexCanister } from '$icp/validation/ic-token.validation';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	$: enabledTokensWithoutTransaction = $enabledFungibleNetworkTokens
		.filter((token) => $icTransactionsStore?.[token.id] === null)
		.map((token: TokenUi) => token as IcToken);

	let tokenListWithoutCanister: string;
	let tokenListWithUnavailableCanister: string;
	$: {
		const result = enabledTokensWithoutTransaction.reduce(
			(
				acc: {
					enabledTokensWithoutCanister: string[];
					enabledTokensWithUnavailableCanister: string[];
				},
				curr
			) => {
				hasNoIndexCanister(curr)
					? acc.enabledTokensWithoutCanister.push(`$${getTokenDisplaySymbol(curr)}`)
					: acc.enabledTokensWithUnavailableCanister.push(`$${getTokenDisplaySymbol(curr)}`);
				return acc;
			},
			{
				enabledTokensWithoutCanister: [],
				enabledTokensWithUnavailableCanister: []
			}
		);

		tokenListWithoutCanister = result.enabledTokensWithoutCanister.join(', ');
		tokenListWithUnavailableCanister = result.enabledTokensWithUnavailableCanister.join(', ');
	}
</script>

<div class="flex flex-col gap-5">
	{#if !$isPrivacyMode}
		<PageTitle>{$i18n.activity.text.title}</PageTitle>
	{:else}
		<span class="flex items-center gap-2">
			<PageTitle>{$i18n.activity.text.title}</PageTitle>
			<span class="text-tertiary">
				<IconEyeOff />
			</span>
		</span>
	{/if}

	{#if notEmptyString(tokenListWithoutCanister)}
		<MessageBox level="warning" closableKey="oisy_ic_hide_transaction_no_canister">
			{replacePlaceholders($i18n.activity.warning.no_index_canister, {
				$token_list: tokenListWithoutCanister
			})}
		</MessageBox>
	{/if}

	{#if notEmptyString(tokenListWithUnavailableCanister)}
		<MessageBox level="warning" closableKey="oisy_ic_hide_transaction_unavailable_canister">
			{replacePlaceholders($i18n.activity.warning.unavailable_index_canister, {
				$token_list: tokenListWithUnavailableCanister
			})}
		</MessageBox>
	{/if}

	<MessageBox level="plain" closableKey="oisy_ic_hide_bitcoin_activity">
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
