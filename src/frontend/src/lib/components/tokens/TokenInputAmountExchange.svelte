<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { MouseEventHandler } from 'svelte/elements';
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
		exchangeRate?: number;
		token?: Token;
		displayUnit?: DisplayUnit;
		disabled?: boolean;
	}

	let {
		amount,
		exchangeRate,
		token,
		displayUnit = $bindable('usd'),
		disabled = false
	}: Props = $props();

	const handleUnitSwitch = () => {
		displayUnit = displayUnit === 'usd' ? 'token' : 'usd';
	};

	const valueId = $props.id();

	const handleClick: MouseEventHandler<HTMLButtonElement> = ({ detail }) => {
		// A double-click fires two clicks (detail 1, then 2); switch once, not back again.
		if (detail > 1) {
			return;
		}

		handleUnitSwitch();
	};

	let formattedUSDAmount = $derived(
		formatCurrency({
			value: nonNullish(amount) && nonNullish(exchangeRate) ? Number(amount) * exchangeRate : 0,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	let formattedTokenAmount = $derived(
		nonNullish(token) ? `${nonNullish(amount) ? amount : 0} ${token.symbol}` : '0'
	);
</script>

<div class="flex items-center" data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE}>
	{#if nonNullish(exchangeRate)}
		<!-- Square and borderless: the global button radius would make the corners unclickable and its border would grow the row. pl-px and gap-1.25 keep the icon and value where they sat before. -->
		<button
			class="gap-1.25 rounded-none border-0 pl-px"
			class:hover:cursor-default={disabled}
			aria-describedby={valueId}
			aria-label={$i18n.tokens.alt.switch_amount_unit}
			data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON}
			{disabled}
			onclick={handleClick}
			type="button"
		>
			<IconArrowUpDown size="14" />
			<span id={valueId} data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE}
				>{displayUnit === 'usd' ? formattedUSDAmount : formattedTokenAmount}</span
			>
		</button>
	{:else}
		<span data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_UNAVAILABLE}
			>{$i18n.tokens.text.exchange_is_not_available}</span
		>
	{/if}
</div>
