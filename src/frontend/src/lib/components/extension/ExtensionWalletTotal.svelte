<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import type { Currency } from '$lib/enums/currency';
	import type { CurrencyExchangeData } from '$lib/types/currency';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		usdTotal: number;
		currency: Currency;
		exchangeRate: CurrencyExchangeData;
		label: string;
		loading?: boolean;
	}

	let { usdTotal, currency, exchangeRate, label, loading = false }: Props = $props();

	let total = $derived(
		formatCurrency({ value: usdTotal, currency, exchangeRate, language: $currentLanguage })
	);
</script>

<!-- The wallet's total as a plain line: the panel only shows, so it has no card or actions. -->
<section class="flex flex-col gap-1" data-tid="extension-wallet-total">
	<output class="text-3xl font-bold break-all">
		{#if loading || isNullish(total)}
			<span class="block w-32 py-2"><SkeletonText /></span>
		{:else if $isPrivacyMode}
			<IconDots times={6} variant="lg" />
		{:else}
			{total}
		{/if}
	</output>

	<span class="text-sm text-tertiary">{label}</span>
</section>
