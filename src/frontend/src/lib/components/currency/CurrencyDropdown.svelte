<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { SUPPORTED_CURRENCIES } from '$env/currency.env';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { CURRENCY_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { Currencies } from '$lib/enums/currencies';
	import { i18n } from '$lib/stores/i18n.store';
	import { getCurrencyName, getCurrencySymbol } from '$lib/utils/currency.utils';

	let dropdown = $state<Dropdown>();

	// const currentCurrency: string = $derived(LANGUAGES[$currentLanguage]);

	const handleCurrencyChange = (currency: Currencies) => {
		// TODO: Add logic to handle language change
		dropdown?.close();
	};
</script>

<span class="lang-selector min-w-32">
	<Dropdown
		bind:this={dropdown}
		ariaLabel={$i18n.core.alt.switch_currency}
		asModalOnMobile
		buttonFullWidth
		buttonBorder
	>
		<!-- {currentCurrency} -->
		ciao

		{#snippet title()}
			{$i18n.core.alt.switch_currency}
		{/snippet}

		{#snippet items()}
			<List noPadding condensed testId={CURRENCY_DROPDOWN}>
				{#each SUPPORTED_CURRENCIES as [currencyKey, currencyVal], index (index + currencyKey)}
					{@const name = getCurrencyName({ currency: currencyVal, language: $currentLanguage })}
					{@const symbol = getCurrencySymbol({ currency: currencyVal, language: $currentLanguage })}
					{@const symbolString = `${nonNullish(symbol) && symbol?.toLowerCase() !== currencyVal ? `${symbol} - ` : ''}${currencyVal.toUpperCase()}`}
					<ListItem>
						<Button
							onclick={() => handleCurrencyChange(currencyVal)}
							fullWidth
							alignLeft
							paddingSmall
							styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
							colorStyle="tertiary-alt"
							transparent
						>
							<span class="pt-0.75 w-[20px] text-brand-primary">
								<!-- {#if $currentCurrency === currencyVal} -->
								<!--	<IconCheck size="20" /> -->
								<!-- {/if} -->
							</span>
							{name}
							{symbolString}
						</Button>
					</ListItem>
				{/each}
			</List>
		{/snippet}
	</Dropdown>
</span>

<style lang="scss">
	:global .lang-selector {
		button {
			font-weight: normal !important;
		}
		.wrapper {
			padding: var(--padding-1_25x) !important;
		}
	}
</style>
