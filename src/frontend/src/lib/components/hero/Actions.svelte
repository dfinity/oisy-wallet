<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
	import ConvertToCkBtc from '$btc/components/convert/ConvertToCkBtc.svelte';
	import BtcReceive from '$btc/components/receive/BtcReceive.svelte';
	import ConvertToCkEth from '$eth/components/convert/ConvertToCkEth.svelte';
	import EthReceive from '$eth/components/receive/EthReceive.svelte';
	import ConvertToCkErc20 from '$eth/components/send/ConvertToCkErc20.svelte';
	import { erc20CustomTokensInitialized } from '$eth/derived/erc20.derived';
	import ConvertToBtc from '$icp/components/convert/ConvertToBtc.svelte';
	import ConvertToEthereum from '$icp/components/convert/ConvertToEthereum.svelte';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { erc20ToCkErc20Enabled, ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import Buy from '$lib/components/buy/Buy.svelte';
	import CheckNewCollectionsButton from '$lib/components/nfts/CheckNewCollectionsButton.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import Send from '$lib/components/send/Send.svelte';
	import Swap from '$lib/components/swap/Swap.svelte';
	import HeroButtonGroup from '$lib/components/ui/HeroButtonGroup.svelte';
	import { allBalancesZero } from '$lib/derived/balances.derived';
	import { failedAddressNetworkIds } from '$lib/derived/failed-addresses.derived';
	import {
		networkEthereum,
		networkICP,
		networkBitcoin,
		pseudoNetworkChainFusion,
		networkId,
		networkSolana,
		networkEvm
	} from '$lib/derived/network.derived';
	import { networkBitcoinMainnetEnabled } from '$lib/derived/networks.derived';
	import { pageToken, pageTokenWithFallback } from '$lib/derived/page-token.derived';
	import { isPageTokenSwappable } from '$lib/derived/swap.derived';
	import { isRouteNfts, isRouteTransactions } from '$lib/utils/nav.utils';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';
	import SolReceive from '$sol/components/receive/SolReceive.svelte';

	// Every action that moves funds needs this network's derived address, so none of them can succeed
	// while it is unavailable — offering them let the user fill in an entire send form and fail at
	// signing, which is worse than not offering them at all. Receive is left in place: it shows `n/a`
	// instead of an address, which at least tells the user what is wrong.
	//
	// Nullish on the Chain Fusion view, where no single network is selected, so the actions stay
	// available there — the other chains still work, and that is the whole point of the degradation.
	let addressUnavailable = $derived(
		nonNullish($networkId) && $failedAddressNetworkIds.includes($networkId)
	);

	// The converts are sends in disguise, so they fail the same way.
	let convertEth = $derived(
		$ethToCkETHEnabled && $erc20CustomTokensInitialized && !addressUnavailable
	);

	let convertErc20 = $derived(
		$erc20ToCkErc20Enabled && $erc20CustomTokensInitialized && !addressUnavailable
	);

	let convertCkBtc = $derived(
		$networkBitcoinMainnetEnabled &&
			$tokenCkBtcLedger &&
			$erc20CustomTokensInitialized &&
			!addressUnavailable
	);

	let convertBtc = $derived(
		$networkBitcoinMainnetEnabled && isNetworkIdBTCMainnet($networkId) && !addressUnavailable
	);

	let isTransactionsPage = $derived(isRouteTransactions(page));
	let isNftsPage = $derived(isRouteNfts(page));

	let swapAction = $derived(
		(!isTransactionsPage || $isPageTokenSwappable || isNullish($pageToken)) &&
			!isNftsPage &&
			!addressUnavailable
	);

	let sendAction = $derived((!$allBalancesZero || isTransactionsPage) && !addressUnavailable);

	let buyAction = $derived(
		(!$networkICP || nonNullish($pageToken?.buy)) && !isNftsPage && !addressUnavailable
	);

	// Only the ICP collection scan (EXT / ICRC-7) is exclusive to this action; the
	// ERC discovery it also triggers already runs on the collections interval loader.
	// So we offer it where that scan applies: ICP, and the all-networks view.
	let checkNewCollectionsAction = $derived(
		isNftsPage && ($networkICP || $pseudoNetworkChainFusion)
	);

	// Temporary workaround: disable the Buy button for tokens that support both Swap and Convert.
	// TODO: Remove once Swap/Convert are refactored and merged.
	let tooManyButtons = $derived(
		sendAction &&
			swapAction &&
			isTransactionsPage &&
			(convertErc20 || convertEth || convertCkBtc || convertBtc)
	);
</script>

<div class="flex w-full justify-center pt-8" role="toolbar">
	<HeroButtonGroup>
		{#if $networkICP}
			<IcReceive token={$pageTokenWithFallback} />
		{:else if $networkEthereum || $networkEvm}
			<EthReceive token={$pageTokenWithFallback} />
		{:else if $networkBitcoin}
			<BtcReceive />
		{:else if $networkSolana}
			<SolReceive token={$pageTokenWithFallback} />
		{:else if $pseudoNetworkChainFusion}
			<Receive />
		{/if}

		{#if sendAction}
			<Send {isNftsPage} {isTransactionsPage} />
		{/if}

		{#if swapAction}
			<Swap />
		{/if}

		{#if checkNewCollectionsAction}
			<CheckNewCollectionsButton />
		{/if}

		{#if isTransactionsPage}
			{#if convertEth}
				{#if $networkICP}
					<ConvertToEthereum />
				{:else}
					<ConvertToCkEth />
				{/if}
			{/if}

			{#if convertErc20}
				{#if $networkICP}
					<ConvertToEthereum />
				{:else}
					<ConvertToCkErc20 />
				{/if}
			{/if}

			{#if convertCkBtc}
				<ConvertToBtc />
			{/if}

			{#if convertBtc}
				<ConvertToCkBtc />
			{/if}
		{/if}

		{#if buyAction && !tooManyButtons}
			<Buy />
		{/if}
	</HeroButtonGroup>
</div>
