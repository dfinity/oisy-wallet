<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO_BI } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	export let token: OptionToken;
	export let balance: OptionBalance;
	export let source: string;
	export let exchangeRate: number | undefined = undefined;
</script>

<Value ref="source" element="div">
	<svelte:fragment slot="label">{$i18n.send.text.source}</svelte:fragment>
	{source}
</Value>

<Value ref="balance" element="div">
	<svelte:fragment slot="label">{$i18n.send.text.balance}</svelte:fragment>
	{#if nonNullish(token)}
		<ExchangeAmountDisplay
			amount={balance ?? ZERO_BI}
			decimals={token.decimals}
			symbol={token.symbol}
			{exchangeRate}
		/>
	{:else}
		&ZeroWidthSpace;
	{/if}
</Value>
