<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { formatUSD } from '$lib/utils/format.utils';

	export let amount: OptionAmount;
	export let exchangeRate: number | undefined;
	export let token: IcToken | undefined = undefined;
	export let displayUnit: DisplayUnit = 'token';

	const dispatch = createEventDispatcher<{
		displayUnitChange: DisplayUnit;
	}>();

	const handleUnitSwitch = () => {
		const newMode = displayUnit === 'usd' ? 'token' : 'usd';
		dispatch('displayUnitChange', newMode);
	};

	let amountUSD: number | undefined;
	$: amountUSD =
		displayUnit === 'usd' && nonNullish(amount) && nonNullish(exchangeRate)
			? Number(amount) * exchangeRate
			: 0;

	let formattedUSDAmount: string |undefined
	$: formattedUSDAmount = nonNullish(amountUSD) ? formatUSD({ value: amountUSD }) : undefined;

	let formattedTokenAmount: string | undefined;
	$: formattedTokenAmount = nonNullish(token)
		? displayUnit === 'token' && nonNullish(amount)
			? `${Number(amount).toString()} ${token.symbol}`
			: `${0} ${token.symbol}`
		: '0';
</script>

<div class="flex items-center gap-1">
	{#if nonNullish(exchangeRate)}
		<button on:click={handleUnitSwitch}>
			<IconArrowUpDown size="14" />
		</button>
		<span>{displayUnit === 'usd' ? formattedUSDAmount : formattedTokenAmount}</span>
	{:else}
		<span>{$i18n.swap.text.exchange_is_not_available}</span>
	{/if}
</div>
