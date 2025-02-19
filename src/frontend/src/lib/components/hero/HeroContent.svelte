<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { isGLDTToken as isGLDTTokenUtil } from '$icp-eth/utils/token.utils';
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
		networkBitcoin,
		networkEthereum,
		networkICP,
		networkSolana,
		pseudoNetworkChainFusion
	} from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
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
				$exchanges: $exchanges
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
</script>

<div
	class="bg-linear-to-b flex h-full w-full flex-col content-center items-center justify-center rounded-[40px] bg-brand-primary bg-pos-0 p-6 text-center text-primary-inverted transition-all duration-500 ease-in-out"
	class:from-brand-primary={$pseudoNetworkChainFusion}
	class:to-absolute-blue={$pseudoNetworkChainFusion}
	class:bg-pos-100={$networkICP || $networkBitcoin || $networkEthereum || $networkSolana}
	class:bg-cover={isTrumpToken}
	class:bg-size-200={!isTrumpToken}
	class:from-interdimensional-blue={$networkICP && !isGLDTToken}
	class:to-chinese-purple={$networkICP && !isGLDTToken}
	class:from-bright-gold={isGLDTToken}
	class:to-golden-sap={isGLDTToken}
	class:from-beer={$networkBitcoin}
	class:to-fulvous={$networkBitcoin}
	class:from-united-nations-blue={$networkEthereum}
	class:to-bright-lilac={$networkEthereum}
	class:bg-gradient-to-r={($networkSolana && !isTrumpToken) || isGLDTToken}
	class:from-lavander-indigo={$networkSolana && !isTrumpToken}
	class:to-medium-spring-green={$networkSolana && !isTrumpToken}
	class:bg-trump-token-hero-image={isTrumpToken}
>
	{#if isTransactionsPage}
		<div in:slide={SLIDE_PARAMS} class="flex w-full flex-col gap-6">
			<div class="grid w-full grid-cols-[1fr_auto_1fr] flex-row items-center justify-between">
				<Back color="current" onlyArrow />

				<div>
					<div class="my-0.5 flex items-center justify-center">
						{#if $erc20UserTokensInitialized && nonNullish($pageToken)}
							<div in:fade>
								<TokenLogo
									data={$pageToken}
									ring
									badge={{ type: 'network', blackAndWhite: true }}
								/>
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
			<ExchangeBalance />
		</div>
	{/if}

	<div in:slide|local={SLIDE_PARAMS} class="flex w-full justify-center text-left">
		<Actions />
	</div>

	{#if isErc20Icp($pageToken)}
		<Erc20Icp />
	{/if}
</div>
