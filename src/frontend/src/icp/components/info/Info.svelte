<script lang="ts">
	import {
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
	import { type HideInfoKey, saveHideInfo, shouldHideInfo } from '$icp/utils/ck.utils';
	import InfoBox from '$icp/components/info/InfoBox.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import InfoEthereum from '$icp/components/info/InfoEthereum.svelte';
	import { token } from '$lib/derived/token.derived';
	import { isNetworkIdBTCMainnet, isNetworkIdETHMainnet } from '$icp/utils/ic-send.utils';
	import type { IcCkToken } from '$icp/types/ic';

	let mainnet = true;
	$: mainnet =
		isNetworkIdBTCMainnet(($token as IcCkToken).twinToken?.network.id) ||
		isNetworkIdETHMainnet(($token as IcCkToken).twinToken?.network.id);

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

	let hideInfo = true;
	$: hideInfo = nonNullish(key) ? shouldHideInfo(key) : true;

	const close = () => {
		hideInfo = true;

		if (isNullish(key)) {
			return;
		}

		saveHideInfo(key);
	};
</script>

{#if ckBTC || ckETH || ckErc20}
	<InfoBox {hideInfo} on:click={close}>
		{#if ckBTC}
			<InfoBitcoin />
		{:else}
			<InfoEthereum />
		{/if}
	</InfoBox>
{/if}
