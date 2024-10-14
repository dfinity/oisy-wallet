<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { balance, balanceZero } from '$lib/derived/balances.derived';
	import { tokenSymbol } from '$lib/derived/token.derived';
</script>

<span>
	<output
		class={`break-all ${($balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'} flex flex-col sm:block`}
	>
		{#if nonNullish($balance) && !$balanceZero}
			<span class="text-5xl font-bold"><Amount amount={$balance} /></span>
		{:else}
			<span class="text-5xl font-bold" class:animate-pulse={isNullish($balance)} ><Amount amount="0.00" /></span>
		{/if}

		{#if $erc20UserTokensInitialized && nonNullish(tokenSymbol)}
			<span class="opacity-100">{$tokenSymbol}</span>
		{/if}
	</output>
</span>
