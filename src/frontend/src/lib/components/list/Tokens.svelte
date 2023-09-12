<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import type { Token } from '$lib/types/token';
	import oisy from '$lib/assets/oisy.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { erc20Tokens } from '$lib/derived/erc20.derived';
	import Listener from '$lib/components/core/Listener.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';

	let tokens: [Token, ...Token[]] = [ETHEREUM_TOKEN];
	$: tokens = [ETHEREUM_TOKEN, ...$erc20Tokens];

	const icon = IconPlus;
</script>

<h2 class="text-base mb-3 pb-0.5">Tokens</h2>

{#each tokens as token}
	{@const url = transactionsUrl(token)}

	<Listener {token}>
		<a class="no-underline" href={url} title={`Open token ${token.name} transactions`}>
			<Card>
				{token.name}

				<Img src={token.icon ?? oisy} slot="icon" alt={`${token.name} logo`} />

				<div class="break-words" slot="amount">
					{formatEtherShort($balancesStore?.[token.id] ?? BigNumber.from(0n))}
					{token.symbol}
				</div>
			</Card>
		</a>
	</Listener>
{/each}

<Card>
	<span class="text-grey">Add new token (Coming soon)</span>

	<RoundedIcon slot="icon" {icon} backgroundStyleClass="bg-dust" />
</Card>
