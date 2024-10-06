<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
	import {
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import type { IcCkToken, IcToken } from '$icp/types/ic';
	import type { HideInfoKey } from '$icp/utils/ck.utils';
	import {
		isCkToken,
		isNetworkIdBTCMainnet,
		isNetworkIdETHMainnet
	} from '$icp/utils/ic-send.utils';
	import InfoEthereum from '$icp-eth/components/info/InfoEthereum.svelte';
	import InfoBoxWrapper from '$lib/components/info/InfoBoxWrapper.svelte';

	export let token: IcToken;

	let mainnet = true;
	$: mainnet =
		isNetworkIdBTCMainnet((token as IcCkToken).twinToken?.network.id) ||
		isNetworkIdETHMainnet((token as IcCkToken).twinToken?.network.id);

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

{#if (ckBTC || ckETH || ckErc20) && isCkToken(token) && nonNullish(token.twinToken)}
	}
	<InfoBoxWrapper {key}>
		{#if ckBTC}
			<InfoBitcoin />
		{:else}
			<InfoEthereum {token} twinToken={token.twinToken} ckTokenSymbol={token.symbol} />
		{/if}
	</InfoBoxWrapper>
{/if}
