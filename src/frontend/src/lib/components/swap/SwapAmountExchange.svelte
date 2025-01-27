<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import {
		SWAP_AMOUNT_EXCHANGE,
		SWAP_AMOUNT_EXCHANGE_BUTTON,
		SWAP_AMOUNT_EXCHANGE_VALUE,
		SWAP_AMOUNT_EXCHANGE_UNAVAILABLE
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { formatUSD } from '$lib/utils/format.utils';

	export let amount: OptionAmount;
	export let exchangeRate: number | undefined;
	export let token: IcToken | undefined = undefined;
	export let displayUnit: DisplayUnit = 'token';

	const handleUnitSwitch = () => {
		displayUnit = displayUnit === 'usd' ? 'token' : 'usd';
	};

	let amountUSD: number | undefined;
	$: amountUSD =
		displayUnit === 'usd' && nonNullish(amount) && nonNullish(exchangeRate)
			? Number(amount) * exchangeRate
			: 0;

	let formattedUSDAmount: string | undefined;
	$: formattedUSDAmount = nonNullish(amountUSD) ? formatUSD({ value: amountUSD }) : undefined;

	let formattedTokenAmount: string | undefined;
	$: formattedTokenAmount = nonNullish(token)
		? displayUnit === 'token' && nonNullish(amount)
			? `${Number(amount).toString()} ${token.symbol}`
			: `${0} ${token.symbol}`
		: '0';
</script>

<div class="flex items-center gap-1" data-tid={SWAP_AMOUNT_EXCHANGE}>
	{#if nonNullish(exchangeRate)}
		<button on:click={handleUnitSwitch} data-tid={SWAP_AMOUNT_EXCHANGE_BUTTON}>
			<IconArrowUpDown size="14" />
		</button>
		<span data-tid={SWAP_AMOUNT_EXCHANGE_VALUE}>{displayUnit === 'usd' ? formattedUSDAmount : formattedTokenAmount}</span>
	{:else}
		<span data-tid={SWAP_AMOUNT_EXCHANGE_UNAVAILABLE}>{$i18n.swap.text.exchange_is_not_available}</span>
	{/if}
</div>
