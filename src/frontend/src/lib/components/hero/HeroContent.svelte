<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade, slide } from 'svelte/transition';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import Back from '$lib/components/core/Back.svelte';
	import Erc20Icp from '$lib/components/core/Erc20Icp.svelte';
	import ExchangeBalance from '$lib/components/exchange/ExchangeBalance.svelte';
	import Actions from '$lib/components/hero/Actions.svelte';
	import Balance from '$lib/components/hero/Balance.svelte';
	import ContextMenu from '$lib/components/hero/ContextMenu.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networkBitcoin, networkEthereum, networkICP } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { OptionTokenUi } from '$lib/types/token';
	import { mapTokenUi } from '$lib/utils/token.utils';

	export let usdTotal = false;
	export let summary = false;

	let pageTokenUi: OptionTokenUi;
	$: pageTokenUi = nonNullish($pageToken)
		? mapTokenUi({
				token: $pageToken,
				$balances: $balancesStore,
				$exchanges: $exchanges
			})
		: undefined;
</script>

<div
	class="class:from-blue-ribbon-light flex h-full w-full flex-col content-center items-center justify-center rounded-[40px] bg-blue-ribbon bg-gradient-to-b from-blue-ribbon via-absolute-blue bg-size-200 bg-pos-0 p-6 text-center text-white transition-all duration-500 ease-in-out"
	class:bg-pos-100={$networkICP || $networkBitcoin || $networkEthereum}
	class:via-interdimensional-blue={$networkICP}
	class:to-chinese-purple={$networkICP}
	class:via-beer={$networkBitcoin}
	class:to-fulvous={$networkBitcoin}
	class:via-united-nations-blue={$networkEthereum}
	class:to-bright-lilac={$networkEthereum}
>
	{#if summary}
		<div transition:slide={SLIDE_PARAMS} class="flex w-full flex-col gap-6">
			<div class="grid w-full grid-cols-[1fr_auto_1fr] flex-row items-center justify-between">
				<Back color="current" onlyArrow />

				<div>
					<div class="my-0.5 flex items-center justify-center">
						{#if $erc20UserTokensInitialized && nonNullish($pageToken)}
							<div in:fade>
								<TokenLogo token={$pageToken} ring networkIconBlackAndWhite />
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
	{/if}

	{#if usdTotal}
		<div transition:slide={SLIDE_PARAMS}>
			<ExchangeBalance />
		</div>
	{/if}

	<div transition:slide|local={SLIDE_PARAMS} class="flex w-full justify-center text-left">
		<Actions />
	</div>

	{#if isErc20Icp($pageToken)}
		<Erc20Icp />
	{/if}
</div>
