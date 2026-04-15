<script lang="ts">
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
	import type { TokenUi } from '$lib/types/token-ui';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	let enabledTokensWithoutTransaction = $derived(
		$enabledFungibleNetworkTokens
			.filter((token) => $icTransactionsStore?.[token.id] === null)
			.map((token: TokenUi) => token as IcToken)
	);

	let { tokensWithoutCanister, tokensWithUnavailableCanister } = $derived.by(() =>
		enabledTokensWithoutTransaction.reduce<{
			tokensWithoutCanister: string[];
			tokensWithUnavailableCanister: string[];
		}>(
			(acc, curr) => {
				// TODO: use a unique token identifier (e.g. token ID + network) instead of the display symbol to avoid collisions if two tokens share the same symbol
				const symbol = getTokenDisplaySymbol(curr);

				if (hasNoIndexCanister(curr)) {
					acc.tokensWithoutCanister.push(symbol);
				} else {
					acc.tokensWithUnavailableCanister.push(symbol);
				}

				return acc;
			},
			{ tokensWithoutCanister: [], tokensWithUnavailableCanister: [] }
		)
	);
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

	{#if tokensWithoutCanister.length > 0}
		<MessageBox closableKey="oisy_ic_hide_transaction_no_canister" level="warning">
			{replacePlaceholders($i18n.activity.warning.no_index_canister, {
				$token_list: tokensWithoutCanister.map((s) => `$${s}`).join(', ')
			})}
		</MessageBox>
	{/if}

	{#if tokensWithUnavailableCanister.length > 0}
		<MessageBox closableKey="oisy_ic_hide_transaction_unavailable_canister" level="warning">
			{replacePlaceholders($i18n.activity.warning.unavailable_index_canister, {
				$token_list: tokensWithUnavailableCanister.map((s) => `$${s}`).join(', ')
			})}
		</MessageBox>
	{/if}

	<MessageBox closableKey="oisy_ic_hide_bitcoin_activity" level="plain">
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
