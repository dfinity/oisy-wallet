<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
	import {
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import type { IcCkToken, IcToken, OptionIcCkToken, OptionIcToken } from '$icp/types/ic-token';
	import { isNetworkIdETHMainnet } from '$icp/utils/ic-send.utils';
	import InfoEthereum from '$icp-eth/components/info/InfoEthereum.svelte';
	import InfoBoxWrapper from '$lib/components/info/InfoBoxWrapper.svelte';
	import {
		networkBitcoinMainnetEnabled,
		networkEthereumEnabled
	} from '$lib/derived/networks.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import type { HideInfoKey } from '$lib/utils/info.utils';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';

	let destinationToken: OptionIcCkToken;
	$: destinationToken = nonNullish($pageToken) ? ($pageToken as IcCkToken) : undefined;

	let sourceToken: OptionIcToken;
	$: sourceToken = nonNullish(destinationToken)
		? (destinationToken.twinToken as IcToken)
		: undefined;

	let mainnet = true;
	$: mainnet =
		isNetworkIdBTCMainnet(sourceToken?.network.id) ||
		isNetworkIdETHMainnet(sourceToken?.network.id);

	let ckBTC = false;
	$: ckBTC = mainnet && $networkBitcoinMainnetEnabled && $tokenCkBtcLedger;

	let ckETH = false;
	$: ckETH = mainnet && $networkEthereumEnabled && $tokenCkEthLedger;

	let ckErc20 = false;
	$: ckErc20 = mainnet && $networkEthereumEnabled && $tokenCkErc20Ledger;

	let key: HideInfoKey | undefined = undefined;
	$: key = ckBTC
		? 'oisy_ic_hide_bitcoin_info'
		: ckETH
			? 'oisy_ic_hide_ethereum_info'
			: ckErc20
				? 'oisy_ic_hide_erc20_info'
				: undefined;
</script>

{#if (ckBTC || ckETH || ckErc20) && nonNullish(sourceToken) && nonNullish(destinationToken)}
	<InfoBoxWrapper {key}>
		{#if ckBTC}
			<InfoBitcoin />
		{:else}
			<InfoEthereum {sourceToken} {destinationToken} />
		{/if}
	</InfoBoxWrapper>
{/if}
