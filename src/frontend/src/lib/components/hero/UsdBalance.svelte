<script lang="ts">
	import { formatTokenDetailed, formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { BigNumber } from '@ethersproject/bignumber';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import type { Token } from '$lib/types/token';
	import { erc20Tokens } from '$lib/derived/erc20.derived';

	let tokens: [Token, ...Token[]] = [ETHEREUM_TOKEN];
	$: tokens = [ETHEREUM_TOKEN, ...$erc20Tokens];

	let ethTotalUsd: number;
	$: ethTotalUsd = tokens.reduce(
		(acc, { id: tokenId }) =>
			acc +
			Number(formatTokenDetailed({ value: $balancesStore?.[tokenId] ?? BigNumber.from(0) })) *
				($exchangeStore?.[tokenId]?.usd ?? 0),
		0
	);
</script>

<span class="text-off-white">
	<output
		class={`break-all ${ethTotalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{#if $exchangeInitialized}
			{formatUSD(ethTotalUsd)}
		{:else}
			&ZeroWidthSpace;
		{/if}
	</output>
	<span class="opacity-100">$</span>
</span>
