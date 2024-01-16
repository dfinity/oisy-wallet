<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { balancesStore } from '$lib/stores/balances.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import Listener from '$lib/components/core/Listener.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import AddToken from '$lib/components/tokens/AddToken.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';

	import { networkEthereum, networkId, networkTokens } from '$lib/derived/network.derived';
</script>

<h2 class="text-base mb-6 pb-1" class:mt-12={AIRDROP} class:mt-16={!AIRDROP}>Tokens</h2>

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
						{formatTokenShort({
							value: $balancesStore?.[token.id].data ?? BigNumber.from(0n),
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
	{/if}
</TokensSkeletons>
