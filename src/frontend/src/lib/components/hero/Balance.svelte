<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { balance, balanceZero } from '$lib/derived/balances.derived';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import { erc20TokensInitialized } from '$eth/derived/erc20.derived';
	import Amount from '$lib/components/ui/Amount.svelte';
</script>

<span class="text-off-white">
	<output class={`break-all ${($balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'}`}>
		{#if nonNullish($balance) && !$balanceZero}
			<span class="amount font-bold"><Amount amount={$balance} /></span>
			{#if $erc20TokensInitialized}
				<span class="opacity-100">{$tokenSymbol}</span>
			{/if}
		{:else}
			<span class="amount font-bold" class:animate-pulse={isNullish($balance)}>0.00</span>
		{/if}
	</output>
</span>

<style lang="scss">
	.amount {
		font-size: calc(2 * var(--font-size-h1));
		line-height: 0.95;
	}
</style>
