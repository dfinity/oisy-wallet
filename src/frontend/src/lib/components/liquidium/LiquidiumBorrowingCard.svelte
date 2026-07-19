<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import LiquidiumProviderTag from '$lib/components/liquidium/LiquidiumProviderTag.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatCurrency, formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';
	import { liquidiumMarketToken } from '$lib/utils/liquidium.utils';

	interface Props {
		// Assets → Borrowings tab row; no action, clicks through to the provider page.
		reserve: LiquidiumReserve;
	}

	let { reserve }: Props = $props();

	const goToProvider = () => {
		void goto(AppPath.ProvidersLiquidium);
	};

	let token = $derived(
		liquidiumMarketToken({ chain: reserve.chain, asset: reserve.asset, tokens: $tokens })
	);

	let borrowedAmount = $derived(
		formatToken({ value: reserve.borrowed, unitName: reserve.borrowedDecimals })
	);

	let borrowedValue = $derived(
		formatCurrency({
			value: reserve.borrowedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

{#snippet providerTag()}
	<LiquidiumProviderTag />
{/snippet}

<div class="flex w-full flex-col">
	<LogoButton onClick={goToProvider} subtitle={providerTag}>
		{#snippet logo()}
			<span class="mr-2 flex">
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
			<span class="text-sm sm:text-lg">{reserve.asset}</span>
		{/snippet}

		{#snippet description()}
			<Badge variant="warning" width="w-fit">
				{`${formatStakeApyNumber(reserve.borrowApy)}% ${$i18n.liquidium.text.borrow_rate}`}
			</Badge>
		{/snippet}

		{#snippet titleEnd()}
			<span class="block min-w-12 text-right text-sm text-nowrap sm:text-base">
				−{borrowedValue}
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="block min-w-12 text-nowrap">
				{borrowedAmount}
				{reserve.asset}
			</span>
		{/snippet}
	</LogoButton>
</div>
