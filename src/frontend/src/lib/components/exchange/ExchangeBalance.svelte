<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { combinedDerivedEnabledNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { balance, balanceZero } from '$lib/derived/balances.derived';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import Amount from '$lib/components/ui/Amount.svelte';

	let totalUsd: number;
	$: totalUsd = $combinedDerivedEnabledNetworkTokensUi.reduce(
		(acc, token) => acc + (token.usdBalance ?? 0),
		0
	);
</script>

<span class="text-off-white block">
	<output
		class={`break-all text-5xl font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd)}
		{:else}
			<span class:animate-pulse={!$exchangeInitialized}>{formatUSD(0)}</span>
		{/if}
	</output>
</span>
