<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SwapAmountExchange from '$lib/components/swap/SwapAmountExchange.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	export let token: Token | undefined = undefined;
	export let amount: OptionAmount;
	export let exchangeRate: number | undefined;
</script>

<div class="mb-1 text-tertiary"><slot name="title" /></div>

{#if nonNullish(token)}
	<div class="flex items-center">
		<TokenLogo data={token} logoSize="md" />

		<div class="ml-2 flex flex-col">
			<span class="text-2xl font-bold">
				{amount}
				{token.symbol}
			</span>
			<span class="text-sm text-tertiary">
				<SwapAmountExchange disabled {amount} {exchangeRate} />
			</span>
		</div>
	</div>
{/if}
