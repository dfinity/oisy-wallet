<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { balance, balanceZero } from '$lib/derived/balances.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { token } from '$lib/stores/token.store';
	import { formatUSD } from '$lib/utils/format.utils';
	import { calculateTokenUsdBalance } from '$lib/utils/token.utils';

	let usdBalance: number | undefined;
	$: usdBalance = nonNullish($token)
		? calculateTokenUsdBalance({
				token: $token,
				$balances: $balancesStore,
				$exchanges: $exchanges
			})
		: undefined;
</script>

<span class="flex flex-col gap-2">
	<output
		class={`break-words ${($balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'} inline-flex w-full flex-row justify-center gap-3 text-4xl font-bold lg:text-5xl`}
	>
		{#if nonNullish($balance) && !$balanceZero}
			<span><Amount amount={$balance} /> {$tokenSymbol}</span>
		{:else}
			<span class:animate-pulse={isNullish($balance)}>0.00 {$tokenSymbol}</span>
		{/if}
	</output>

	<span class="text-xl font-bold" class:opacity-50={usdBalance ?? 0 === 0}>
		{#if nonNullish(usdBalance)}
			{formatUSD({ value: usdBalance })}
		{:else}
			<span class:animate-pulse={isNullish(usdBalance)}
				>{formatUSD({
					value: 0,
					options: { minFraction: 0, maxFraction: 0 }
				}).replace('0', '-')}</span
			>
		{/if}
	</span>
</span>
