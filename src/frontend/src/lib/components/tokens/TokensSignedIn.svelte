<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { enabledNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import ManageTokensModal from '$icp-eth/components/tokens/ManageTokensModal.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenReceiveSend from '$lib/components/tokens/TokenReceiveSend.svelte';
	import { balancesStore } from '$lib/stores/balances.store';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $enabledNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);
</script>

<TokensSkeletons>
	{#each tokens as token (token.id)}
		<Listener {token}>
			<div in:fade>
				<TokenCard {token}>
					<output class="break-all" slot="description">
						{formatToken({
							value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0n),
							unitName: token.decimals
						})}
						{token.symbol}
					</output>

					<CardAmount slot="exchange">
						<ExchangeTokenValue {token} />
					</CardAmount>

					<TokenReceiveSend {token} slot="actions" />
				</TokenCard>
			</div>
		</Listener>
	{/each}

	{#if tokens.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalManageTokens}
		<ManageTokensModal />
	{/if}
</TokensSkeletons>
