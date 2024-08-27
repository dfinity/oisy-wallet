<script lang="ts">
	import {
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
	import type { HideInfoKey } from '$icp/utils/ck.utils';
	import InfoEthereum from '$icp/components/info/InfoEthereum.svelte';
	import { isNetworkIdBTCMainnet, isNetworkIdETHMainnet } from '$icp/utils/ic-send.utils';
	import type { OptionIcCkToken } from '$icp/types/ic';
	import { token } from '$lib/stores/token.store';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import InfoBoxWrapper from '$lib/components/info/InfoBoxWrapper.svelte';

	let mainnet = true;
	$: mainnet =
		isNetworkIdBTCMainnet(($token as OptionIcCkToken)?.twinToken?.network.id) ||
		isNetworkIdETHMainnet(($token as OptionIcCkToken)?.twinToken?.network.id);

	let ckBTC = false;
	$: ckBTC = mainnet && $tokenCkBtcLedger;

	let ckETH = false;
	$: ckETH = mainnet && $tokenCkEthLedger;

	let ckErc20 = false;
	$: ckErc20 = mainnet && $tokenCkErc20Ledger;

	let key: HideInfoKey | undefined = undefined;
	$: key = ckBTC
		? 'oisy_ic_hide_bitcoin_info'
		: ckETH
			? 'oisy_ic_hide_ethereum_info'
			: ckErc20
				? 'oisy_ic_hide_erc20_info'
				: undefined;
</script>

{#if ckBTC || ckETH || ckErc20}
	<InfoBoxWrapper {key}>
		{#if ckBTC}
			<InfoBitcoin />
		{:else}
			<InfoEthereum twinToken={$ckEthereumTwinToken} ckTokenSymbol={$tokenWithFallback.symbol} />
		{/if}
	</InfoBoxWrapper>
{/if}
