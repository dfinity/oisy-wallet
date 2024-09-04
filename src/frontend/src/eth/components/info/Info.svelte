<script lang="ts">
	import type { HideInfoKey } from '$icp/utils/ck.utils';
	import { nonNullish } from '@dfinity/utils';
	import { isNetworkIdBTCMainnet, isNetworkIdETHMainnet } from '$icp/utils/ic-send.utils';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
	import { isSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
	import type { Erc20Token } from '$eth/types/erc20';
	import InfoEthereum from '$icp-eth/components/info/InfoEthereum.svelte';
	import InfoBoxWrapper from '$lib/components/info/InfoBoxWrapper.svelte';

	let mainnet = true;
	$: mainnet =
		isNetworkIdBTCMainnet($tokenWithFallback.network.id) ||
		isNetworkIdETHMainnet($tokenWithFallback.network.id);

	let ckETH = false;
	$: ckETH = mainnet && $tokenWithFallback.id === ETHEREUM_TOKEN_ID;

	let ckErc20 = false;
	$: ckErc20 = mainnet && isSupportedErc20TwinTokenId($tokenWithFallback.id);

	let key: HideInfoKey | undefined = undefined;
	$: key = ckETH ? 'oisy_ic_hide_ethereum_info' : ckErc20 ? 'oisy_ic_hide_erc20_info' : undefined;

	const twinTokenSymbol =
		$tokenWithFallback.id === ETHEREUM_TOKEN_ID
			? 'ckETH'
			: isSupportedErc20TwinTokenId($tokenWithFallback.id)
				? ($tokenWithFallback as Erc20Token).twinTokenSymbol
				: undefined;
</script>

{#if (ckETH || ckErc20) && nonNullish(twinTokenSymbol)}
	<InfoBoxWrapper {key}>
		<InfoEthereum twinToken={$tokenWithFallback} ckTokenSymbol={twinTokenSymbol} />
	</InfoBoxWrapper>
{/if}
