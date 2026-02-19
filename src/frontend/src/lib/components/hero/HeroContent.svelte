<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { page } from '$app/state';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import {
		isGLDTToken as isGLDTTokenUtil,
		isVCHFToken as isVCHFTokenUtil,
		isVEURToken as isVEURTokenUtil
	} from '$icp-eth/utils/token.utils';
	import Back from '$lib/components/core/Back.svelte';
	import Erc20Icp from '$lib/components/core/Erc20Icp.svelte';
	import ExchangeBalance from '$lib/components/exchange/ExchangeBalance.svelte';
	import ExchangeRateChange from '$lib/components/exchange/ExchangeRateChange.svelte';
	import Actions from '$lib/components/hero/Actions.svelte';
	import Balance from '$lib/components/hero/Balance.svelte';
	import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import {
		balance,
		balanceZero,
		noPositiveBalanceAndNotAllBalancesZero
	} from '$lib/derived/balances.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import {
		networkBase,
		networkBitcoin,
		networkBsc,
		networkEthereum,
		networkPolygon,
		networkICP,
		networkSolana,
		pseudoNetworkChainFusion,
		networkArbitrum,
		selectedNetworkNftUnsupported
	} from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { type HeroContext, initHeroContext, HERO_CONTEXT_KEY } from '$lib/stores/hero.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { isRouteNfts, isRouteTransactions } from '$lib/utils/nav.utils';
	import { getTokenDisplayName, mapTokenUi } from '$lib/utils/token.utils';
	import { isTrumpToken as isTrumpTokenUtil } from '$sol/utils/token.utils';

	let pageTokenUi = $derived(
		nonNullish($pageToken)
			? mapTokenUi({
					token: $pageToken,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges
				})
			: undefined
	);

	let { usdPrice, usdPriceChangePercentage24h } = $derived(
		nonNullish(pageTokenUi)
			? pageTokenUi
			: { usdPrice: undefined, usdPriceChangePercentage24h: undefined }
	);

	let formattedExchangeRate = $derived(
		nonNullish(usdPrice)
			? formatCurrency({
					value: usdPrice,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	const { loading, outflowActionsDisabled, inflowActionsDisabled, ...rest } = initHeroContext();
	setContext<HeroContext>(HERO_CONTEXT_KEY, {
		loading,
		outflowActionsDisabled,
		inflowActionsDisabled,
		...rest
	});

	$effect(() => {
		loading.set(
			isRouteTransactions(page)
				? isNullish(pageTokenUi?.balance)
				: $noPositiveBalanceAndNotAllBalancesZero
		);
	});

	let isTransactionsPage = $derived(isRouteTransactions(page));

	let isNftsPage = $derived(isRouteNfts(page));

	let hasNoUsableBalance = $derived(!$isIcMintingAccount && ($balanceZero || isNullish($balance)));

	$effect(() => {
		outflowActionsDisabled.set(isTransactionsPage && hasNoUsableBalance);
	});

	$effect(() => {
		inflowActionsDisabled.set(isNftsPage && $selectedNetworkNftUnsupported);
	});

	let isTrumpToken = $derived(nonNullish($pageToken) ? isTrumpTokenUtil($pageToken) : false);

	let isGLDTToken = $derived(nonNullish($pageToken) ? isGLDTTokenUtil($pageToken) : false);

	let isVchfToken = $derived(nonNullish($pageToken) && isVCHFTokenUtil($pageToken));

	let isVeurToken = $derived(nonNullish($pageToken) && isVEURTokenUtil($pageToken));

	let isGradientToRight = $derived($networkSolana && !isTrumpToken);

	let isGradientToBottomRight = $derived(isGLDTToken || $networkBsc);
</script>

<div
	class="bg-pos-0 flex h-full w-full flex-col content-center items-center justify-center rounded-[24px] bg-brand-primary p-3 text-center text-primary-inverted transition-all duration-500 ease-in-out md:rounded-[28px] md:p-5"
	class:bg-center={isVeurToken}
	class:bg-cover={isTrumpToken || isVchfToken || isVeurToken}
	class:bg-gradient-to-r={isGradientToRight}
	class:bg-linear-105={isGradientToBottomRight}
	class:bg-linear-to-b={!isGradientToRight && !isGradientToBottomRight}
	class:bg-pos-100={!$pseudoNetworkChainFusion}
	class:bg-size-200={!isTrumpToken}
	class:bg-top-right={isVchfToken}
	class:bg-trump-token-hero-image={isTrumpToken}
	class:bg-vchf-token-hero-image={isVchfToken}
	class:bg-veur-token-hero-image={isVeurToken}
	class:from-arbitrum-0={$networkArbitrum}
	class:from-base-0={$networkBase}
	class:from-bsc-0={$networkBsc}
	class:from-btc-0={$networkBitcoin}
	class:from-default-0={$pseudoNetworkChainFusion}
	class:from-eth-0={$networkEthereum}
	class:from-gold-0={isGLDTToken}
	class:from-icp-0={$networkICP && !isGLDTToken}
	class:from-polygon-0={$networkPolygon}
	class:from-sol-0={$networkSolana && !isTrumpToken}
	class:from-trump-0={isTrumpToken}
	class:to-arbitrum-100={$networkArbitrum}
	class:to-base-100={$networkBase}
	class:to-bsc-100={$networkBsc}
	class:to-btc-100={$networkBitcoin}
	class:to-default-100={$pseudoNetworkChainFusion}
	class:to-eth-100={$networkEthereum}
	class:to-gold-100={isGLDTToken}
	class:to-icp-100={$networkICP && !isGLDTToken}
	class:to-polygon-100={$networkPolygon}
	class:to-sol-100={$networkSolana && !isTrumpToken}
	class:to-trump-100={isTrumpToken}
>
	{#if isTransactionsPage}
		<div class="flex w-full flex-col gap-6" in:slide={SLIDE_PARAMS}>
			<div class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 sm:gap-2">
				<Back color="current" onlyArrow />

				<div
					class="sm:text-md my-0.5 flex w-full min-w-0 items-center justify-between gap-4 text-sm text-nowrap"
				>
					{#if nonNullish(pageTokenUi)}
						<div class="flex min-w-0 items-center justify-center gap-1 sm:gap-2" in:fade>
							<TokenLogo data={pageTokenUi} logoSize="sm" ring />

							<div class="flex flex-col text-left">
								<span class="truncate font-semibold">
									{getTokenDisplayName(pageTokenUi)}
								</span>

								<div class="flex items-center justify-center gap-1">
									<NetworkLogo network={pageTokenUi.network} size="xxs" transparent />
									<span class="truncate text-xs sm:text-sm">
										{pageTokenUi.network.name}
									</span>
								</div>
							</div>
						</div>

						<div class="flex flex-col text-right">
							<span class="leading-none font-semibold">
								{formattedExchangeRate}
							</span>

							<span>
								<ExchangeRateChange timeFrame="24h" {usdPriceChangePercentage24h} withBackground />
							</span>
						</div>
					{:else}
						<SkeletonLogo size="small" />
					{/if}
				</div>

				<ContextMenu />
			</div>

			<Balance token={pageTokenUi} />
		</div>
	{:else}
		<div in:slide={SLIDE_PARAMS}>
			<ExchangeBalance hideBalance={$isPrivacyMode} />
		</div>
	{/if}

	<div class="flex w-full justify-center text-left" in:slide|local={SLIDE_PARAMS}>
		<Actions />
	</div>

	{#if isErc20Icp($pageToken)}
		<Erc20Icp />
	{/if}
</div>
