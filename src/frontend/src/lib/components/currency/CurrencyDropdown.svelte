<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { SUPPORTED_CURRENCIES } from '$env/currency.env';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import {
		CURRENCY_SWITCHER_BUTTON,
		CURRENCY_SWITCHER_DROPDOWN,
		CURRENCY_SWITCHER_DROPDOWN_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { Currencies } from '$lib/enums/currencies';
	import type { Languages } from '$lib/enums/languages';
	import { currencyStore } from '$lib/stores/currency.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { getCurrencyName, getCurrencySymbol } from '$lib/utils/currency.utils';

	let dropdown = $state<Dropdown>();

	const parseSymbolString = ({
		currency,
		language
	}: {
		currency: Currencies;
		language: Languages;
	}): string => {
		const symbol = getCurrencySymbol({ currency, language });
		return `${nonNullish(symbol) && symbol?.toLowerCase() !== currency ? `${symbol} - ` : ''}${currency.toUpperCase()}`;
	};

	const handleCurrencyChange = (currency: Currencies) => {
		currencyStore.switchCurrency(currency);
		dropdown?.close();
	};
</script>

<span class="currency-selector min-w-32">
	<Dropdown
		bind:this={dropdown}
		ariaLabel={$i18n.core.alt.switch_currency}
		asModalOnMobile
		buttonFullWidth
		buttonBorder
		testId={CURRENCY_SWITCHER_BUTTON}
	>
		{parseSymbolString({ currency: $currentCurrency, language: $currentLanguage })}

		{#snippet title()}
			{$i18n.core.alt.switch_currency}
		{/snippet}

		{#snippet items()}
			<List noPadding condensed testId={CURRENCY_SWITCHER_DROPDOWN}>
				{#each SUPPORTED_CURRENCIES as [currencyKey, currencyVal], index (index + currencyKey)}
					{@const name = getCurrencyName({ currency: currencyVal, language: $currentLanguage })}
					{@const symbolString = parseSymbolString({
						currency: currencyVal,
						language: $currentLanguage
					})}

					<ListItem>
						<Button
							onclick={() => handleCurrencyChange(currencyVal)}
							fullWidth
							contentFullWidth
							alignLeft
							paddingSmall
							styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
							colorStyle="tertiary-alt"
							transparent
							testId={`${CURRENCY_SWITCHER_DROPDOWN_BUTTON}-${currencyVal}`}
						>
							<span class="pt-0.75 w-[20px] text-brand-primary">
								{#if $currentCurrency === currencyVal}
									<IconCheck size="20" />
								{/if}
							</span>
							<div class="flex w-full flex-row justify-between gap-5">
								{name}
								<span class="text-right text-tertiary">{symbolString}</span>
							</div>
						</Button>
					</ListItem>
				{/each}
			</List>
		{/snippet}
	</Dropdown>
</span>

<style lang="scss">
	:global .currency-selector {
		button {
			font-weight: normal !important;
		}
		.wrapper {
			padding: var(--padding-1_25x) !important;
		}
	}
</style>
