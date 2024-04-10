<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { balancesStore } from '$lib/stores/balances.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import Listener from '$lib/components/core/Listener.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import AddToken from '$eth/components/tokens/AddToken.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import {
		networkEthereum,
		networkICP,
		networkId,
		networkTokens
	} from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import IcAddToken from '$icp/components/tokens/IcAddToken.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
</script>

<Header>
	{$i18n.tokens.text.title} <span class="font-normal">({$networkTokens.length})</span>

	<TokensMenu slot="end" />
</Header>

<TokensSkeletons>
	{#each $networkTokens as token (token.id)}
		{@const url = transactionsUrl({ token, networkId: $networkId })}

		<Listener {token}>
			<a
				class="no-underline"
				href={url}
				aria-label={`Open the list of ${token.symbol} transactions`}
			>
				<Card>
					{token.name}

					<Logo src={token.icon} slot="icon" alt={`${token.name} logo`} size="46px" color="white" />

					<output class="break-all" slot="description">
						{formatToken({
							value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0n),
							unitName: token.decimals
						})}
						{token.symbol}
					</output>

					<ExchangeTokenValue {token} slot="amount" />
				</Card>
			</a>
		</Listener>
	{/each}

	{#if $networkEthereum}
		<AddToken />
	{:else if $networkICP}
		<IcAddToken />
	{/if}
</TokensSkeletons>
