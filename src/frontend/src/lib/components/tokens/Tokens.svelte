<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { balancesStore } from '$lib/stores/balances.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import { networkTokens } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import Header from '$lib/components/ui/Header.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import type { Token } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalAddToken, modalIcManageTokens } from '$lib/derived/modal.derived';
	import AddTokenModal from '$eth/components/tokens/AddTokenModal.svelte';
	import IcManageTokensModal from '$icp-eth/components/tokens/IcManageTokensModal.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenReceiveSend from '$lib/components/tokens/TokenReceiveSend.svelte';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: Token[];
	$: tokens = $networkTokens.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);
</script>

<Header>
	{$i18n.tokens.text.title}

	<TokensMenu slot="end" />
</Header>

<TokensSkeletons>
	{#each tokens as token (token.id)}
		{@const url = transactionsUrl({ token })}

		<Listener {token}>
			<div class="flex gap-8 mb-6">
				<a
					class="no-underline flex-1"
					href={url}
					aria-label={`Open the list of ${token.symbol} transactions`}
					in:fade
				>
					<Card noMargin>
						{token.name}

						<TokenLogo {token} slot="icon" color="white" />

						<output class="break-all" slot="description">
							{formatToken({
								value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0n),
								unitName: token.decimals
							})}
							{token.symbol}
						</output>

						<CardAmount slot="action">
							<ExchangeTokenValue {token} />
						</CardAmount>
					</Card>
				</a>

				<TokenReceiveSend {token} />
			</div>
		</Listener>
	{/each}

	{#if tokens.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalAddToken}
		<AddTokenModal />
	{:else if $modalIcManageTokens}
		<IcManageTokensModal />
	{/if}
</TokensSkeletons>
