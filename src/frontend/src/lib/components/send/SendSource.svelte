<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		balance: OptionBalance;
		source: string;
		exchangeRate?: number;
	}

	let { token, balance, source, exchangeRate = undefined }: Props = $props();
</script>

<Value element="div" ref="source">
	{#snippet label()}
		{$i18n.send.text.source}
	{/snippet}

	{#snippet content()}
		{source}
	{/snippet}
</Value>

<Value element="div" ref="balance">
	{#snippet label()}
		{$i18n.send.text.balance}
	{/snippet}

	{#snippet content()}
		{#if nonNullish(token)}
			<ExchangeAmountDisplay
				amount={balance ?? ZERO}
				decimals={token.decimals}
				{exchangeRate}
				symbol={token.symbol}
			/>
		{:else}
			&ZeroWidthSpace;
		{/if}
	{/snippet}
</Value>
