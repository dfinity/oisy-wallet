<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { preventDefault } from 'svelte/legacy';
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

	interface Props {
		amount: OptionAmount;
		exchangeRate: number | undefined;
		token?: Token | undefined;
		displayUnit?: DisplayUnit;
		disabled?: boolean;
	}

	let {
		amount,
		exchangeRate,
		token = undefined,
		displayUnit = $bindable('usd'),
		disabled = false
	}: Props = $props();

	const handleUnitSwitch = () => {
		displayUnit = displayUnit === 'usd' ? 'token' : 'usd';
	};

	let formattedUSDAmount: string | undefined = $derived(
		formatCurrency({
			value: nonNullish(amount) && nonNullish(exchangeRate) ? Number(amount) * exchangeRate : 0,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	let formattedTokenAmount: string | undefined = $derived(
		nonNullish(token) ? `${nonNullish(amount) ? amount : 0} ${token.symbol}` : '0'
	);
</script>

<div class="flex items-center gap-1" data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE}>
	{#if nonNullish(exchangeRate)}
		<button
			class:hover:cursor-default={disabled}
			data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON}
			{disabled}
			onclick={preventDefault(handleUnitSwitch)}
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
