<script lang="ts">
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		amount?: bigint;
		token: Token;
		exchangeRate?: number;
		showNullishLabel?: boolean;
	}

	let { amount = ZERO, token, exchangeRate, showNullishLabel = false }: Props = $props();
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
				{amount}
				decimals={token.decimals}
				{exchangeRate}
				symbol={token.symbol}
			/>
		{/if}
	{/snippet}
</Value>
