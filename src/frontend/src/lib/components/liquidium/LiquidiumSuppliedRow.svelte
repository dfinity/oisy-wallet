<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import OverlappedLogos from '$lib/components/ui/OverlappedLogos.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { liquidiumAssetNetworkIcons } from '$lib/derived/liquidium.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency, formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';
	import { liquidiumMarketToken } from '$lib/utils/liquidium.utils';
	import { getTokenDisplayName } from '$lib/utils/token.utils';

	interface Props {
		reserve: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	let token = $derived(
		liquidiumMarketToken({ chain: reserve.chain, asset: reserve.asset, tokens: $tokens })
	);

	// Icons for every rail the asset trades on (e.g. USDC → Ethereum + ICP), not just this row's chain.
	let networkIcons = $derived($liquidiumAssetNetworkIcons[reserve.asset] ?? []);

	let suppliedAmount = $derived(
		formatToken({ value: reserve.deposited, unitName: reserve.depositedDecimals })
	);

	// Yearly interest at the current supply APY.
	let currentlyEarning = $derived((reserve.suppliedUsd * reserve.supplyApy) / 100);

	let suppliedValue = $derived(
		formatCurrency({
			value: reserve.suppliedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<LogoButton hover={false}>
	{#snippet logo()}
		<span class="sm:mr-2 flex items-center gap-1">
			{#if nonNullish(token)}
				<TokenLogo color="white" data={token} logoSize={isMobile() ? 'sm' : 'lg'} />
			{/if}
			{#if networkIcons.length > 0}
				<OverlappedLogos icons={networkIcons} invertColor />
			{/if}
		</span>
	{/snippet}

	{#snippet title()}
		<span class="text-sm font-normal sm:text-base">
			<span class="font-bold">{reserve.asset}</span>
			{#if nonNullish(token)}
				· {suppliedAmount} {reserve.asset}
			{/if}
		</span>
	{/snippet}

	{#snippet description()}
		{#if nonNullish(token)}
			<span class="text-primary">{getTokenDisplayName(token)}</span>
		{/if}
	{/snippet}

	{#snippet titleEnd()}
		<span>{suppliedValue}</span>
	{/snippet}

	{#snippet descriptionEnd()}
		<EarningYearlyAmount showAsSuccess showPlusSign showWithShortenedLabel value={currentlyEarning}>
			{formatStakeApyNumber(reserve.supplyApy)}% {$i18n.liquidium.text.apy_suffix} ·
		</EarningYearlyAmount>
	{/snippet}
</LogoButton>
