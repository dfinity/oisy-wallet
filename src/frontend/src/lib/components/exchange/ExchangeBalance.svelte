<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import type { Token } from '$lib/types/token';
	import { erc20Tokens } from '$lib/derived/erc20.derived';
	import { usdValue } from '$lib/utils/exchange.utils';

	let tokens: [Token, ...Token[]] = [ETHEREUM_TOKEN];
	$: tokens = [ETHEREUM_TOKEN, ...$erc20Tokens];

	let totalUsd: number;
	$: totalUsd = tokens.reduce(
		(acc, { id: tokenId }) =>
			acc +
			usdValue({
				tokenId,
				balances: $balancesStore,
				exchanges: $exchangeStore
			}),
		0
	);
</script>

<span class="text-off-white">
	<span class="opacity-100">$</span>
	<output
		class={`break-all font-bold ${
			totalUsd === 0 ? 'opacity-50' : 'opacity-100'
		} inline-block mt-8`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd)}
		{:else}
			&ZeroWidthSpace;
		{/if}
	</output>
</span>
