<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import {
		isGLDTToken as isGLDTTokenUtil,
		isVCHFToken as isVCHFTokenUtil,
		isVEURToken as isVEURTokenUtil
	} from '$icp-eth/utils/token.utils';
	import Back from '$lib/components/core/Back.svelte';
	import Erc20Icp from '$lib/components/core/Erc20Icp.svelte';
	import ExchangeBalance from '$lib/components/exchange/ExchangeBalance.svelte';
	import Actions from '$lib/components/hero/Actions.svelte';
	import Balance from '$lib/components/hero/Balance.svelte';
	import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import {
		balance,
		balanceZero,
		noPositiveBalanceAndNotAllBalancesZero
	} from '$lib/derived/balances.derived';
	import { exchangeNotInitialized, exchanges } from '$lib/derived/exchange.derived';
	import {
		networkBase,
		networkBitcoin,
		networkBsc,
		networkEthereum,
		networkPolygon,
		networkICP,
		networkSolana,
		pseudoNetworkChainFusion
	} from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { type HeroContext, initHeroContext, HERO_CONTEXT_KEY } from '$lib/stores/hero.store';
	import type { OptionTokenUi } from '$lib/types/token';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { isTrumpToken as isTrumpTokenUtil } from '$sol/utils/token.utils';

	let pageTokenUi: OptionTokenUi;
	$: pageTokenUi = nonNullish($pageToken)
		? mapTokenUi({
				token: $pageToken,
				$balances: $balancesStore,
				$exchanges
			})
		: undefined;

	const { loading, outflowActionsDisabled, ...rest } = initHeroContext();
	setContext<HeroContext>(HERO_CONTEXT_KEY, {
		loading,
		outflowActionsDisabled,
		...rest
	});

	$: loading.set(
		isRouteTransactions($page)
			? isNullish(pageTokenUi?.balance)
			: $exchangeNotInitialized || $noPositiveBalanceAndNotAllBalancesZero
	);

	let isTransactionsPage = false;
	$: isTransactionsPage = isRouteTransactions($page);

	$: outflowActionsDisabled.set(isTransactionsPage && ($balanceZero || isNullish($balance)));

	let isTrumpToken = false;
	$: isTrumpToken = nonNullish($pageToken) ? isTrumpTokenUtil($pageToken) : false;

	let isGLDTToken = false;
	$: isGLDTToken = nonNullish($pageToken) ? isGLDTTokenUtil($pageToken) : false;

	let isVchfToken = false;
	$: isVchfToken = nonNullish($pageToken) && isVCHFTokenUtil($pageToken);

	let isVeurToken = false;
	$: isVeurToken = nonNullish($pageToken) && isVEURTokenUtil($pageToken);

	let isGradientToRight = false;
	$: isGradientToRight = $networkSolana && !isTrumpToken;

	let isGradientToBottomRight = false;
	$: isGradientToBottomRight = isGLDTToken || $networkBsc;
</script>

<div
	class="flex h-full w-full flex-col content-center items-center justify-center rounded-[24px] bg-brand-primary bg-pos-0 p-3 text-center text-primary-inverted transition-all duration-500 ease-in-out"
	class:from-default-0={$pseudoNetworkChainFusion}
	class:to-default-100={$pseudoNetworkChainFusion}
	class:bg-pos-100={!$pseudoNetworkChainFusion}
	class:bg-cover={isTrumpToken || isVchfToken || isVeurToken}
	class:from-trump-0={isTrumpToken}
	class:to-trump-100={isTrumpToken}
	class:bg-size-200={!isTrumpToken}
	class:from-icp-0={$networkICP && !isGLDTToken}
	class:to-icp-100={$networkICP && !isGLDTToken}
	class:from-gold-0={isGLDTToken}
	class:to-gold-100={isGLDTToken}
	class:from-btc-0={$networkBitcoin}
	class:to-btc-100={$networkBitcoin}
	class:from-eth-0={$networkEthereum}
	class:to-eth-100={$networkEthereum}
	class:from-base-0={$networkBase}
	class:to-base-100={$networkBase}
	class:from-bsc-0={$networkBsc}
	class:to-bsc-100={$networkBsc}
	class:from-polygon-0={$networkPolygon}
	class:to-polygon-100={$networkPolygon}
	class:from-sol-0={$networkSolana && !isTrumpToken}
	class:to-sol-100={$networkSolana && !isTrumpToken}
	class:bg-trump-token-hero-image={isTrumpToken}
	class:bg-vchf-token-hero-image={isVchfToken}
	class:bg-top-right={isVchfToken}
	class:bg-veur-token-hero-image={isVeurToken}
	class:bg-center={isVeurToken}
	class:bg-linear-to-b={!isGradientToRight && !isGradientToBottomRight}
	class:bg-gradient-to-r={isGradientToRight}
	class:bg-linear-105={isGradientToBottomRight}
>
	{#if isTransactionsPage}
		<div in:slide={SLIDE_PARAMS} class="flex w-full flex-col gap-6">
			<div class="grid w-full grid-cols-[1fr_auto_1fr] flex-row items-center justify-between">
				<Back color="current" onlyArrow />

				<div>
					<div class="my-0.5 flex items-center justify-center">
						{#if $erc20UserTokensInitialized && nonNullish($pageToken)}
							<div in:fade>
								<TokenLogo data={$pageToken} ring badge={{ type: 'network' }} />
							</div>
						{:else}
							<SkeletonLogo size="small" />
						{/if}
					</div>
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

	<div in:slide|local={SLIDE_PARAMS} class="flex w-full justify-center text-left">
		<Actions />
	</div>

	{#if isErc20Icp($pageToken)}
		<Erc20Icp />
	{/if}
</div>
