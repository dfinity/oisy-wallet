<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token?: Token;
		amount: OptionAmount;
		exchangeRate?: number;
		title: Snippet;
	}

	let { token, amount, exchangeRate, title }: Props = $props();
</script>

<div class="mb-1 text-tertiary">
	{@render title()}
</div>

{#if nonNullish(token)}
	<div class="flex items-center">
		<TokenLogo badge={{ type: 'network' }} data={token} logoSize="md" />

		<div class="ml-2 flex flex-col">
			<span class="text-2xl font-bold">
				{amount}
				{getTokenDisplaySymbol(token)}
			</span>
			<span class="text-sm text-tertiary">
				<TokenInputAmountExchange {amount} disabled {exchangeRate} />
			</span>
		</div>
	</div>
{/if}
