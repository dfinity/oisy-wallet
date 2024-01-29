<script lang="ts">
	import { tokenCkBtcLedger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
	import { type HideInfoKey, saveHideInfo, shouldHideInfo } from '$icp/utils/ck.utils';
	import InfoBox from '$icp/components/info/InfoBox.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import InfoEthereum from '$icp/components/info/InfoEthereum.svelte';

	let ckBTC = false;
	$: ckBTC = $tokenCkBtcLedger;

	let ckETH = false;
	$: ckETH = $tokenCkEthLedger;

	let key: HideInfoKey | undefined = undefined;
	$: key = ckBTC ? 'oisy_ic_hide_bitcoin_info' : ckETH ? 'oisy_ic_hide_ethereum_info' : undefined;

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

{#if ckBTC || ckETH}
	<InfoBox {hideInfo} on:click={close}>
		{#if ckBTC}
			<InfoBitcoin />
		{:else}
			<InfoEthereum />
		{/if}
	</InfoBox>
{/if}
