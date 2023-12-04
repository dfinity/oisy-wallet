<script lang="ts">
	import { formatTokenDetailed, formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { BigNumber } from '@ethersproject/bignumber';
	import { exchangeStore } from '$lib/stores/exchange.store';

	let ethTotalUsd: number;
	$: ethTotalUsd =
		Number(
			formatTokenDetailed({ value: $balancesStore?.[ETHEREUM_TOKEN_ID] ?? BigNumber.from(0) })
		) * ($exchangeStore?.[ETHEREUM_TOKEN_ID]?.usd ?? 0);
</script>

<span class="text-off-white">
	<output
		class={`break-words ${ethTotalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
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
