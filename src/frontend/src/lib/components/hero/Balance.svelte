<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import Amount from '$lib/components/ui/Amount.svelte';
	import type { OptionTokenUi } from '$lib/types/token';

	export let token: OptionTokenUi;
</script>

<span>
	<output
		class={`break-all ${(token?.balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'} flex flex-col sm:block`}
	>
		{#if nonNullish(token?.balance) && !token.balance.isZero()}
			<span class="text-5xl font-bold"><Amount amount={token.balance} /></span>
		{:else}
			<span class="text-5xl font-bold" class:animate-pulse={isNullish(token?.balance)}>0.00</span>
		{/if}

		{#if $erc20UserTokensInitialized && nonNullish(token?.symbol)}
			<span class="opacity-100">{token.symbol}</span>
		{/if}
	</output>
</span>
