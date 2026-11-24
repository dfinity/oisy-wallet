<script lang="ts">
	import bitcoin from '$btc/assets/bitcoin.svg?inline';
	import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
	import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
	import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
	import usdCoin from '$eth/assets/usdc.svg?inline';
	import tetherGold from '$eth/assets/xaut.svg?inline';
	import ethereum from '$icp-eth/assets/eth.svg?inline';
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import nvidia from '$sol/assets/nvdax.svg?inline';
	import tesla from '$sol/assets/tslax.svg?inline';

	// Sample holdings laid out like the home screen's TokenCard rows; nothing here reads wallet
	// state. TokenCard itself waits for the exchange worker, which never starts signed out, so its
	// fiat value and 24h change would stay skeletons here.
	const tokens: (CardData & { usdPrice: number; usdPriceChangePercentage24h: number })[] = [
		{
			name: 'Bitcoin',
			symbol: 'BTC',
			decimals: 8,
			icon: bitcoin,
			network: BTC_MAINNET_NETWORK,
			balance: 42_000_000n,
			usdBalance: 40_385.04,
			usdPrice: 96_154.86,
			usdPriceChangePercentage24h: 1.84
		},
		{
			name: 'Tesla xStock',
			symbol: 'TSLAx',
			decimals: 8,
			icon: tesla,
			network: SOLANA_MAINNET_NETWORK,
			balance: 1_200_000_000n,
			usdBalance: 5_412.0,
			usdPrice: 451.0,
			usdPriceChangePercentage24h: 3.12
		},
		{
			name: 'Ethereum',
			symbol: 'ETH',
			decimals: 18,
			icon: ethereum,
			network: ETHEREUM_NETWORK,
			balance: 1_350_000_000_000_000_000n,
			usdBalance: 4_382.51,
			usdPrice: 3_246.3,
			usdPriceChangePercentage24h: -0.62
		},
		{
			name: 'NVIDIA xStock',
			symbol: 'NVDAx',
			decimals: 8,
			icon: nvidia,
			network: SOLANA_MAINNET_NETWORK,
			balance: 2_000_000_000n,
			usdBalance: 3_640.8,
			usdPrice: 182.04,
			usdPriceChangePercentage24h: 0.94
		},
		{
			name: 'Tether Gold',
			symbol: 'XAUt',
			decimals: 6,
			icon: tetherGold,
			network: ETHEREUM_NETWORK,
			balance: 800_000n,
			usdBalance: 3_312.48,
			usdPrice: 4_140.6,
			usdPriceChangePercentage24h: 0.21
		},
		{
			name: 'USD Coin',
			symbol: 'USDC',
			decimals: 6,
			icon: usdCoin,
			network: ETHEREUM_NETWORK,
			balance: 2_400_000_000n,
			usdBalance: 2_400.0,
			usdPrice: 1,
			usdPriceChangePercentage24h: 0
		}
	];

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
			{#each tokens as data (data.symbol)}
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
