<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatUSD } from '$lib/utils/format.utils';

	export let amount: OptionAmount;
	export let exchangeRate: number | undefined;

	let amountUSD: number | undefined;
	$: amountUSD = nonNullish(amount) && nonNullish(exchangeRate) ? Number(amount) * exchangeRate : 0;
</script>

<div class="flex items-center gap-1">
	{#if nonNullish(exchangeRate)}
		<IconArrowUpDown size="14" />

		<span>{formatUSD({ value: amountUSD })}</span>
	{:else}
		<span>{$i18n.swap.text.exchange_is_not_available}</span>
	{/if}
</div>
