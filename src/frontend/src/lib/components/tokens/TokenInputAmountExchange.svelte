<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconArrowUpDown from '$lib/components/icons/lucide/IconArrowUpDown.svelte';
	import {
		TOKEN_INPUT_AMOUNT_EXCHANGE,
		TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON,
		TOKEN_INPUT_AMOUNT_EXCHANGE_UNAVAILABLE,
		TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE
	} from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { formatCurrency } from '$lib/utils/format.utils';

	export let amount: OptionAmount;
	export let exchangeRate: number | undefined;
	export let token: Token | undefined = undefined;
	export let displayUnit: DisplayUnit = 'usd';
	export let disabled = false;

	const handleUnitSwitch = () => {
		displayUnit = displayUnit === 'usd' ? 'token' : 'usd';
	};

	let formattedUSDAmount: string | undefined;
	$: formattedUSDAmount = formatCurrency({
		value: nonNullish(amount) && nonNullish(exchangeRate) ? Number(amount) * exchangeRate : 0,
		currency: $currentCurrency,
		exchangeRate: $currencyExchangeStore,
		language: $currentLanguage
	});

	let formattedTokenAmount: string | undefined;
	$: formattedTokenAmount = nonNullish(token)
		? `${nonNullish(amount) ? amount : 0} ${token.symbol}`
		: '0';
</script>

<div class="flex items-center gap-1" data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE}>
	{#if nonNullish(exchangeRate)}
		<button
			class:hover:cursor-default={disabled}
			data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON}
			{disabled}
			on:click|preventDefault={handleUnitSwitch}
		>
			<IconArrowUpDown size="14" />
		</button>
		<span data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE}
			>{displayUnit === 'usd' ? formattedUSDAmount : formattedTokenAmount}</span
		>
	{:else}
		<span data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_UNAVAILABLE}
			>{$i18n.tokens.text.exchange_is_not_available}</span
		>
	{/if}
</div>
