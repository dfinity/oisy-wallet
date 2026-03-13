<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import {
		initCkBTCMinterInfoWorker,
		initCkETHMinterInfoWorker
	} from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { findTwinToken } from '$lib/utils/token.utils';

	let ckBtcToken = $derived(
		findTwinToken({
			tokenToPair: BTC_MAINNET_TOKEN,
			tokens: $enabledIcTokens
		})
	);

	let ckBtcMinterInfoLoaded = $derived(
		nonNullish(ckBtcToken?.id) && $ckBtcMinterInfoStore?.[ckBtcToken.id]?.certified === true
	);

	let ckEthTokens = $derived(
		SUPPORTED_ETHEREUM_TOKENS.map((ethToken) => ({
			ethToken,
			ckToken: findTwinToken({
				tokenToPair: ethToken,
				tokens: $enabledIcTokens
			})
		})).filter(({ ckToken }) => nonNullish(ckToken))
	);
</script>

{#if nonNullish(ckBtcToken) && !ckBtcMinterInfoLoaded}
	<IcCkListener
		initFn={initCkBTCMinterInfoWorker}
		token={ckBtcToken}
		twinToken={ckBtcToken.twinToken}
	/>
{/if}

{#each ckEthTokens as { ethToken, ckToken } (ethToken.id)}
	<IcCkListener
		initFn={initCkETHMinterInfoWorker}
		minterCanisterId={ckToken?.minterCanisterId}
		token={ethToken}
	/>
{/each}
