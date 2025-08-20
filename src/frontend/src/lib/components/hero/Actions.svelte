<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
	import ConvertToCkBTC from '$btc/components/convert/ConvertToCkBTC.svelte';
	import BtcReceive from '$btc/components/receive/BtcReceive.svelte';
	import { SWAP_ACTION_ENABLED } from '$env/actions.env';
	import ConvertToCkETH from '$eth/components/convert/ConvertToCkETH.svelte';
	import EthReceive from '$eth/components/receive/EthReceive.svelte';
	import ConvertToCkERC20 from '$eth/components/send/ConvertToCkERC20.svelte';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import ConvertToBTC from '$icp/components/convert/ConvertToBTC.svelte';
	import ConvertToEthereum from '$icp/components/convert/ConvertToEthereum.svelte';
	import IcReceive from '$icp/components/receive/IcReceive.svelte';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { erc20ToCkErc20Enabled, ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import Buy from '$lib/components/buy/Buy.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import Send from '$lib/components/send/Send.svelte';
	import Swap from '$lib/components/swap/Swap.svelte';
	import HeroButtonGroup from '$lib/components/ui/HeroButtonGroup.svelte';
	import { allBalancesZero } from '$lib/derived/balances.derived';
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
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';
	import SolReceive from '$sol/components/receive/SolReceive.svelte';

	let convertEth = $derived($ethToCkETHEnabled && $erc20UserTokensInitialized);

	let convertErc20 = $derived($erc20ToCkErc20Enabled && $erc20UserTokensInitialized);

	let convertCkBtc = $derived(
		$networkBitcoinMainnetEnabled && $tokenCkBtcLedger && $erc20UserTokensInitialized
	);

	let convertBtc = $derived($networkBitcoinMainnetEnabled && isNetworkIdBTCMainnet($networkId));

	let isTransactionsPage = $derived(isRouteTransactions(page));

	let swapAction = $derived(
		SWAP_ACTION_ENABLED && (!isTransactionsPage || (isTransactionsPage && $networkICP))
	);

	let sendAction = $derived(!$allBalancesZero || isTransactionsPage);

	let buyAction = $derived(!$networkICP || nonNullish($pageToken?.buy));
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
			<Send {isTransactionsPage} />
		{/if}

		{#if swapAction}
			<Swap />
		{/if}

		{#if isTransactionsPage}
			{#if convertEth}
				{#if $networkICP}
					<ConvertToEthereum />
				{:else}
					<ConvertToCkETH />
				{/if}
			{/if}

			{#if convertErc20}
				{#if $networkICP}
					<ConvertToEthereum />
				{:else}
					<ConvertToCkERC20 />
				{/if}
			{/if}

			{#if convertCkBtc}
				<ConvertToBTC />
			{/if}

			{#if convertBtc}
				<ConvertToCkBTC />
			{/if}
		{/if}

		{#if buyAction}
			<Buy />
		{/if}
	</HeroButtonGroup>
</div>
