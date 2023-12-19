<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
	import { balance, balanceZero } from '$lib/derived/balances.derived';
	import { tokenDecimals, tokenSymbol } from '$lib/derived/token.derived';
	import { erc20TokensInitialized } from '$lib/derived/erc20.derived';
</script>

<span class="text-off-white">
	<output
		class={`break-all font-bold ${
			($balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'
		}`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{nonNullish($balance) && !$balanceZero
			? formatTokenShort({
					value: $balance,
					unitName: $tokenDecimals
				})
			: '0'}
	</output>
	{#if $erc20TokensInitialized}
		<span class="opacity-100">{$tokenSymbol}</span>
	{/if}
</span>
