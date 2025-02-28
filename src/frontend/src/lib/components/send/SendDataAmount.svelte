<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';

	export let amount: OptionAmount = undefined;
	export let token: Token;
	export let exchangeRate: number | undefined = undefined;
	export let showNullishLabel = false;

	let bigNumberAmount: BigNumber;
	$: bigNumberAmount = parseToken({
		value: `${amount ?? 0}`,
		unitName: token.decimals
	});
</script>

<Value ref="amount" element="div">
	<svelte:fragment slot="label">{$i18n.core.text.amount}</svelte:fragment>
	{#if showNullishLabel}
		{$i18n.send.error.unable_to_retrieve_amount}
	{:else}
		<ExchangeAmountDisplay
			amount={bigNumberAmount}
			decimals={token.decimals}
			symbol={token.symbol}
			{exchangeRate}
		/>
	{/if}
</Value>
