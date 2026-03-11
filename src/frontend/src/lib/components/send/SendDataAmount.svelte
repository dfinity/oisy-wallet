<script lang="ts">
	import { isMaxUint256 } from '$eth/utils/transactions.utils';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		amount?: bigint;
		token: OptionToken;
		exchangeRate?: number;
		showNullishLabel?: boolean;
		showUnlimitedLabel?: boolean;
	}

	let {
		amount = ZERO,
		token,
		exchangeRate,
		showNullishLabel = false,
		showUnlimitedLabel = false
	}: Props = $props();

	let isUnlimited = $derived(showUnlimitedLabel && isMaxUint256(amount));
</script>

<Value element="div" ref="amount">
	{#snippet label()}
		{$i18n.core.text.amount}
	{/snippet}

	{#snippet content()}
		{#if showNullishLabel}
			{$i18n.send.error.unable_to_retrieve_amount}
		{:else if isUnlimited}
			{replacePlaceholders($i18n.core.text.unlimited, {
				$items: token?.symbol ?? ''
			})}
		{:else}
			<ExchangeAmountDisplay
				{amount}
				decimals={token?.decimals ?? 0}
				{exchangeRate}
				symbol={token?.symbol ?? ''}
			/>
		{/if}
	{/snippet}
</Value>
