<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import type { OptionTokenUi } from '$lib/types/token';

	export let token: OptionTokenUi;
</script>

<span class="flex flex-col gap-2">
	<output
		class={`break-words ${(token?.balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'} inline-flex w-full flex-row justify-center gap-3 text-4xl font-bold lg:text-5xl`}
	>
		{#if nonNullish(token?.balance) && nonNullish(token?.symbol) && !token.balance.isZero()}
			<span><Amount amount={token.balance} /> {token.symbol}</span>
		{:else}
			<span class:animate-pulse={isNullish(token?.balance)}>0.00</span>
		{/if}
	</output>

	<span class="text-xl font-bold opacity-50">
		<TokenExchangeBalance balance={token?.balance} usdBalance={token?.usdBalance} />
	</span>
</span>
