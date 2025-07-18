<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	export let token: OptionToken;
	export let balance: OptionBalance;
	export let source: string;
	export let exchangeRate: number | undefined = undefined;
</script>

<Value ref="source" element="div">
	{#snippet label()}
		{$i18n.send.text.source}
	{/snippet}

	{#snippet content()}
		{source}
	{/snippet}
</Value>

<Value ref="balance" element="div">
	{#snippet label()}
		{$i18n.send.text.balance}
	{/snippet}

	{#snippet content()}
		{#if nonNullish(token)}
			<ExchangeAmountDisplay
				amount={balance ?? ZERO}
				decimals={token.decimals}
				symbol={token.symbol}
				{exchangeRate}
			/>
		{:else}
			&ZeroWidthSpace;
		{/if}
	{/snippet}
</Value>
