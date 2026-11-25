<script lang="ts">
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { LANDING_HOLD_TOKENS } from '$lib/constants/landing-preview.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';

	const price = (value: number): string | undefined =>
		formatCurrency({
			value,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		});

	const changeSign = (pct: number): 'positive' | 'negative' | 'zero' =>
		pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'zero';

	const categories = [
		TokenCategoryTagValue.CRYPTO,
		TokenCategoryTagValue.STABLECOIN,
		TokenCategoryTagValue.STOCK,
		TokenCategoryTagValue.COMMODITY
	];
</script>

<LandingPreviewFrame label={$i18n.auth.landing.hold_preview}>
	<div class="flex flex-col gap-4 bg-page p-3 sm:p-4">
		<!-- The app's filter bar scrolls; here the row fades out at the edge instead. -->
		<div class="chips flex gap-2 overflow-hidden px-2 pt-2">
			<PillButton selected>{$i18n.tokens.text.asset_type_all}</PillButton>
			{#each categories as category (category)}
				<PillButton>{$i18n.token_tag.category[category]}</PillButton>
			{/each}
		</div>

		<div class="flex flex-col gap-3">
			{#each LANDING_HOLD_TOKENS as data (data.symbol)}
				{@const sign = changeSign(data.usdPriceChangePercentage24h)}
				<div class="overflow-hidden rounded-xl">
					<LogoButton hover={false} rounded={false}>
						{#snippet logo()}
							<span class="mr-2 flex">
								<TokenLogo badge={{ type: 'network' }} color="white" {data} logoSize="lg" />
							</span>
						{/snippet}

						{#snippet title()}{data.symbol}{/snippet}

						{#snippet subtitle()}
							<span class="ml-2 flex items-baseline gap-1 text-sm sm:ml-2.5 sm:gap-2">
								{price(data.usdPrice)}
								<!-- ExchangeRateChange's markup, with the sample change instead of a live one. -->
								<span
									class="px-1 text-xs sm:text-sm"
									class:text-error-primary={sign === 'negative'}
									class:text-success-primary={sign === 'positive'}
									class:text-tertiary={sign === 'zero'}
								>
									<span
										style="clip-path: polygon(50% 100%, 0% 0%, 100% 0%); background: currentColor;"
										class="mb-px inline-block h-[0.45em] w-[0.45em]"
										class:-rotate-90={sign === 'zero'}
										class:rotate-180={sign === 'positive'}
									></span>
									{Math.abs(data.usdPriceChangePercentage24h).toFixed(2)}%
								</span>
							</span>
						{/snippet}

						{#snippet titleEnd()}
							<span class="block min-w-12 text-nowrap">
								{formatToken({ value: data.balance ?? ZERO, unitName: data.decimals })}
							</span>
						{/snippet}

						{#snippet description()}
							<span class="text-primary">{data.name}</span>
						{/snippet}

						{#snippet descriptionEnd()}
							<span class="block min-w-12 text-nowrap">
								<TokenExchangeBalance balance={data.balance} usdBalance={data.usdBalance} />
							</span>
						{/snippet}
					</LogoButton>
				</div>
			{/each}
		</div>
	</div>
</LandingPreviewFrame>

<style lang="scss">
	.chips {
		mask-image: linear-gradient(to right, black calc(100% - 48px), transparent);
	}
</style>
