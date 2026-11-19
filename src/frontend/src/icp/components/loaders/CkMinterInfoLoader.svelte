<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { loadCkSolConversionAddresses } from '$icp/services/cksol-deposit.services';
	import {
		initCkBTCMinterInfoWorker,
		initCkETHMinterInfoWorker
	} from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { consoleError } from '$lib/utils/console.utils';
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

	let ckSolMinterCanisterId = $derived(
		findTwinToken({
			tokenToPair: SOLANA_TOKEN,
			tokens: $enabledIcTokens
		})?.minterCanisterId
	);

	// Activity names the Solana legs of ckSOL conversions by the addresses they pass through. The
	// deposit address takes an update call, so it is asked for only where ckSOL is enabled, once
	// per session.
	$effect(() => {
		const minterCanisterId = ckSolMinterCanisterId;
		const identity = $authIdentity;

		if (isNullish(minterCanisterId) || isNullish(identity)) {
			return;
		}

		loadCkSolConversionAddresses({ identity, minterCanisterId }).catch((err: unknown) =>
			consoleError('Failed to load the ckSOL conversion addresses', err)
		);
	});
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
