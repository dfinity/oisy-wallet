<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency, formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';

	interface Props {
		reserve: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	let token = $derived(LIQUIDIUM_ASSET_TOKENS[reserve.asset]);

	let borrowedAmount = $derived(
		formatToken({ value: reserve.borrowed, unitName: reserve.borrowedDecimals })
	);

	// Yearly cost at the current borrow APR.
	let currentlyPaying = $derived((reserve.borrowedUsd * reserve.borrowApy) / 100);

	let borrowedValue = $derived(
		formatCurrency({
			value: reserve.borrowedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<LogoButton hover={false}>
	{#snippet logo()}
		<span class="sm:mr-2 flex">
			{#if nonNullish(token)}
				<TokenLogo
					badge={{ type: 'network' }}
					color="white"
					data={token}
					logoSize={isMobile() ? 'sm' : 'lg'}
				/>
			{/if}
		</span>
	{/snippet}

	{#snippet title()}
		<span class="text-sm font-normal sm:text-base">
			<span class="font-bold">{reserve.asset}</span>
			{#if nonNullish(token)}
				· {borrowedAmount} {reserve.asset}
			{/if}
		</span>
	{/snippet}

	{#snippet description()}
		{#if nonNullish(token)}
			<TokenNameAndNetwork data={token} />
		{/if}
	{/snippet}

	{#snippet titleEnd()}
		<span class="text-error-primary">{borrowedValue}</span>
	{/snippet}

	{#snippet descriptionEnd()}
		<EarningYearlyAmount showAsError showMinusSign showWithShortenedLabel value={currentlyPaying}>
			{formatStakeApyNumber(reserve.borrowApy)}% {$i18n.borrow.text.apr} ·
		</EarningYearlyAmount>
	{/snippet}
</LogoButton>
