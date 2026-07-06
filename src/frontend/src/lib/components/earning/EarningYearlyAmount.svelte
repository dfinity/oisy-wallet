<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		value?: number;
		styleClass?: string;
		showPlusSign?: boolean;
		showMinusSign?: boolean;
		showAsNeutral?: boolean;
		showAsError?: boolean;
		showAsSuccess?: boolean;
		showWithShortenedLabel?: boolean;
		fallback?: Snippet;
	}

	const {
		value,
		showPlusSign = false,
		showMinusSign = false,
		styleClass,
		showAsNeutral = false,
		showAsSuccess = false,
		showAsError = false,
		showWithShortenedLabel = false,
		fallback
	}: Props = $props();

	let formattedCurrency = $derived(
		nonNullish(value)
			? formatCurrency({
					// The sign is prefixed below; format the magnitude when showMinusSign is set so a
					// negative value doesn't render a doubled minus (formatCurrency signs it too).
					value: showMinusSign ? Math.abs(value) : value,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	let yearlyAmount = $derived(
		nonNullish(formattedCurrency)
			? replacePlaceholders(
					showWithShortenedLabel
						? $i18n.stake.text.active_earning_per_year_short
						: $i18n.stake.text.active_earning_per_year,
					{
						$amount: `${formattedCurrency}`
					}
				)
			: undefined
	);

	let positiveAmount = $derived(nonNullish(value) && value > 0);
	let hasAmount = $derived(nonNullish(value) && value !== 0);
</script>

{#if nonNullish(yearlyAmount)}
	<span
		class={`whitespace-nowrap ${styleClass ?? ''}`}
		class:text-brand-primary-alt={positiveAmount && showAsNeutral}
		class:text-error-primary={positiveAmount && showAsError}
		class:text-success-primary={positiveAmount && showAsSuccess}
		class:text-tertiary={!positiveAmount}
		in:fade
	>
		{`${showPlusSign && positiveAmount ? '+' : showMinusSign && hasAmount ? '−' : ''}${yearlyAmount}`}
	</span>
{:else if nonNullish(fallback)}
	{@render fallback()}
{:else}
	<SkeletonText />
{/if}
