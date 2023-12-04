<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import type { Token } from '$lib/types/token';
	import { balancesStore } from '$lib/stores/balances.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { erc20Tokens } from '$lib/derived/erc20.derived';
	import Listener from '$lib/components/core/Listener.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import AddToken from '$lib/components/tokens/AddToken.svelte';
	import TokensLoader from '$lib/components/tokens/TokensLoader.svelte';

	let tokens: [Token, ...Token[]] = [ETHEREUM_TOKEN];
	$: tokens = [ETHEREUM_TOKEN, ...$erc20Tokens];
</script>

<h2 class="text-base mb-6 pb-1" class:mt-12={AIRDROP} class:mt-16={!AIRDROP}>Tokens</h2>

<TokensLoader>
	{#each tokens as token (token.id)}
		{@const url = transactionsUrl(token)}

		<Listener {token}>
			<a
				class="no-underline"
				href={url}
				aria-label={`Open the list of ${token.symbol} transactions`}
			>
				<Card>
					{token.name}

					<Logo src={token.icon} slot="icon" alt={`${token.name} logo`} size="46px" color="white" />

					<output class="break-all" slot="amount">
						{formatTokenShort({
							value: $balancesStore?.[token.id] ?? BigNumber.from(0n),
							unitName: token.decimals
						})}
						{token.symbol}
					</output>
				</Card>
			</a>
		</Listener>
	{/each}

	<AddToken />
</TokensLoader>
