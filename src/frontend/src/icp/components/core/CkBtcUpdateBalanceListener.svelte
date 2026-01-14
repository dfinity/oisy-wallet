<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { CkBTCUpdateBalanceWorker } from '$icp/services/worker.ckbtc-update-balance.services';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { findTwinToken } from '$lib/utils/token.utils';

	let ckBtcToken = $derived(
		findTwinToken({
			tokenToPair: BTC_MAINNET_TOKEN,
			tokens: $enabledIcTokens
		})
	);
</script>

{#if nonNullish(ckBtcToken)}
	<IcCkListener
		initFn={CkBTCUpdateBalanceWorker.init}
		token={ckBtcToken}
		twinToken={ckBtcToken.twinToken}
	/>
{/if}
