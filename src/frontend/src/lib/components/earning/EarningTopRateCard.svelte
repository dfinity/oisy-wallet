<script lang="ts">
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import LiquidiumProviderTag from '$lib/components/liquidium/LiquidiumProviderTag.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import OverlappedLogos from '$lib/components/ui/OverlappedLogos.svelte';
	import ProviderTag from '$lib/components/ui/ProviderTag.svelte';
	import { LIQUIDIUM_PROVIDER_ID } from '$lib/constants/liquidium.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { EarningTopRate } from '$lib/types/earning';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency, formatStakeApyNumber } from '$lib/utils/format.utils';

	interface Props {
		topRate: EarningTopRate;
		// The user's balance outside any earning position, which the yearly amount is based on.
		uninvestedUsd: number;
		// Where the row is shown, for the analytics of what it opens.
		sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS;
	}

	let { topRate, uninvestedUsd, sourceLocation }: Props = $props();

	let { token, symbol, providerId, networkIcons, networkNames, apy, earningPotentialUsd } =
		$derived(topRate);

	let formattedUninvested = $derived(
		formatCurrency({
			value: uninvestedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<div class="flex w-full flex-col">
	<LogoButton onClick={() => topRate.action(sourceLocation)}>
		{#snippet logo()}
			<span class="flex items-end sm:mr-2">
				<TokenLogo color="white" data={token} logoSize={isMobile() ? 'sm' : 'lg'} />
				{#if networkIcons.length > 0}
					<!-- The networks sit where the single network badge would, as in the Liquidium Supplied
					     section; role="img" + aria-label names them, since the icon alts are only URLs. -->
					<span class="-ml-[18px]" aria-label={networkNames.join(', ')} role="img">
						<OverlappedLogos icons={networkIcons} invertColor />
					</span>
				{/if}
			</span>
		{/snippet}

		{#snippet title()}
			<span class="text-sm sm:text-lg">{symbol}</span>
		{/snippet}

		{#snippet subtitle()}
			{#if providerId === LIQUIDIUM_PROVIDER_ID}
				<LiquidiumProviderTag />
			{:else}
				<span class="hidden sm:inline-block">
					<ProviderTag name={$i18n.vaults.text.autopilot} styleClass="ml-2 mb-1" />
				</span>
			{/if}
		{/snippet}

		{#snippet description()}
			<Badge variant="success" width="w-fit">
				{`${formatStakeApyNumber(apy)}% ${$i18n.earning.card_fields.apy}`}
			</Badge>
		{/snippet}

		{#snippet titleEnd()}
			<span class="block min-w-12 text-sm text-nowrap sm:text-base">
				<EarningYearlyAmount
					showAsSuccess
					showPlusSign
					showWithShortenedLabel
					value={earningPotentialUsd}
				/>
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="block min-w-12 text-nowrap">{formattedUninvested}</span>
		{/snippet}
	</LogoButton>
</div>
