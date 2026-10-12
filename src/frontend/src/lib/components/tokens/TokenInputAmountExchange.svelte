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
	import { preventDefault } from '$lib/utils/event-modifiers.utils';
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

	const handleValueClick = ({ currentTarget }: MouseEvent & { currentTarget: HTMLSpanElement }) => {
		if (disabled) {
			return;
		}

		// A click that ends a drag-select must keep the text selected for copying, not switch the unit.
		const selection = window.getSelection();
		if (
			nonNullish(selection) &&
			!selection.isCollapsed &&
			(currentTarget.contains(selection.anchorNode) || currentTarget.contains(selection.focusNode))
		) {
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
		<!-- The spacing before the value is the button's padding, not a flex gap, and the button is square (the global button radius would clip hits in its corners), so there is no dead zone between the two click targets. -->
		<button
			class="flex items-center self-stretch rounded-none pr-1"
			class:hover:cursor-default={disabled}
			aria-label={$i18n.tokens.alt.switch_amount_unit}
			data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON}
			{disabled}
			onclick={preventDefault(handleUnitSwitch)}
		>
			<IconArrowUpDown size="14" />
		</button>
		<!-- The icon button above is the keyboard and screen-reader path; the value is an extra pointer target only. -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class:cursor-pointer={!disabled}
			data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE}
			onclick={handleValueClick}
			>{displayUnit === 'usd' ? formattedUSDAmount : formattedTokenAmount}</span
		>
	{:else}
		<span data-tid={TOKEN_INPUT_AMOUNT_EXCHANGE_UNAVAILABLE}
			>{$i18n.tokens.text.exchange_is_not_available}</span
		>
	{/if}
</div>
