<script lang="ts">
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount?: OptionAmount;
		token: Token;
		exchangeRate?: number;
		showNullishLabel?: boolean;
	}

	let {
		amount = undefined,
		token,
		exchangeRate = undefined,
		showNullishLabel = false
	}: Props = $props();

	let bigNumberAmount: bigint = $derived(
		parseToken({
			value: `${amount ?? 0}`,
			unitName: token.decimals
		})
	);
</script>

<Value element="div" ref="amount">
	{#snippet label()}
		{$i18n.core.text.amount}
	{/snippet}

	{#snippet content()}
		{#if showNullishLabel}
			{$i18n.send.error.unable_to_retrieve_amount}
		{:else}
			<ExchangeAmountDisplay
				amount={bigNumberAmount}
				decimals={token.decimals}
				{exchangeRate}
				symbol={token.symbol}
			/>
		{/if}
	{/snippet}
</Value>
