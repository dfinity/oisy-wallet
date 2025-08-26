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
	import type { Currency } from '$lib/enums/currency';
	import type { Languages } from '$lib/enums/languages';
	import { currencyStore } from '$lib/stores/currency.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { getCurrencyName, getCurrencySymbol } from '$lib/utils/currency.utils';

	let dropdown = $state<Dropdown>();

	const parseSymbolString = ({
		currency,
		language
	}: {
		currency: Currency;
		language: Languages;
	}): string => {
		const symbol = getCurrencySymbol({ currency, language });
		return `${nonNullish(symbol) && symbol.toLowerCase() !== currency ? `${symbol} - ` : ''}${currency.toUpperCase()}`;
	};

	const handleCurrencyChange = (currency: Currency) => {
		currencyStore.switchCurrency(currency);
		dropdown?.close();
	};

	let currencies = $derived.by(() => {
		const language = $currentLanguage;

		return SUPPORTED_CURRENCIES.reduce<
			{ key: string; currency: Currency; name: string; symbol: string }[]
		>((acc, [key, currency]) => {
			const name = getCurrencyName({ currency, language });

			return nonNullish(name)
				? [...acc, { key, currency, name, symbol: parseSymbolString({ currency, language }) }]
				: acc;
		}, []);
	});

	let sortedCurrencies = $derived(currencies.sort((a, b) => a.name.localeCompare(b.name)));
</script>

<span class="currency-selector min-w-32">
	<Dropdown
		bind:this={dropdown}
		ariaLabel={$i18n.core.alt.switch_currency}
		asModalOnMobile
		buttonBorder
		buttonFullWidth
		testId={CURRENCY_SWITCHER_BUTTON}
	>
		{parseSymbolString({ currency: $currentCurrency, language: $currentLanguage })}

		{#snippet title()}
			{$i18n.core.alt.switch_currency}
		{/snippet}

		{#snippet items()}
			<List condensed noPadding testId={CURRENCY_SWITCHER_DROPDOWN}>
				{#each sortedCurrencies as { key, currency, name, symbol }, index (index + key)}
					<ListItem>
						<Button
							alignLeft
							colorStyle="tertiary-alt"
							contentFullWidth
							fullWidth
							onclick={() => handleCurrencyChange(currency)}
							paddingSmall
							styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
							testId={`${CURRENCY_SWITCHER_DROPDOWN_BUTTON}-${currency}`}
							transparent
						>
							<span class="pt-0.75 w-[20px] text-brand-primary">
								{#if $currentCurrency === currency}
									<IconCheck size="20" />
								{/if}
							</span>
							<div class="flex w-full flex-row justify-between gap-5">
								<span class="first-letter:uppercase">{name}</span>
								<span class="text-right text-tertiary">{symbol}</span>
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
