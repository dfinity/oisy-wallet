<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token?: Token;
		amount: OptionAmount;
		exchangeRate?: number;
		// The fiat line under the amount. Opt out where the row is one leg of a
		// price the screen already states in full — dropping `exchangeRate` is not
		// the same thing, as that renders the "unavailable" fallback instead.
		showExchangeValue?: boolean;
		title: Snippet;
	}

	let { token, amount, exchangeRate, showExchangeValue = true, title }: Props = $props();

	let formattedAmount = $derived(
		nonNullish(token) && nonNullish(amount) && notEmptyString(`${amount}`)
			? formatToken({
					value: parseToken({ value: `${amount}`, unitName: token.decimals }),
					unitName: token.decimals,
					displayDecimals: token.decimals
				})
			: amount
	);
</script>

<div class="mb-1 text-tertiary">
	{@render title()}
</div>

{#if nonNullish(token)}
	<div class="flex items-center">
		<TokenLogo badge={{ type: 'network' }} data={token} logoSize="md" />

		<div class="ml-2 flex flex-col">
			<span class="text-2xl font-bold">
				{formattedAmount}
				{getTokenDisplaySymbol(token)}
			</span>
			{#if showExchangeValue}
				<span class="text-sm text-tertiary">
					<TokenInputAmountExchange {amount} disabled {exchangeRate} />
				</span>
			{/if}
		</div>
	</div>
{/if}
