<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkBTCUpdateBalanceWorker } from '$icp/services/worker.ckbtc-update-balance.services';
	import type { IcCkToken } from '$icp/types/ic-token';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { findTwinToken } from '$lib/utils/token.utils';

	let ckBtcToken: IcCkToken | undefined = $derived(
		findTwinToken({
			tokenToPair: BTC_MAINNET_TOKEN,
			tokens: $enabledIcTokens
		})
	);
</script>

{#if nonNullish(ckBtcToken)}
	<IcCkListener
		initFn={initCkBTCUpdateBalanceWorker}
		token={ckBtcToken}
		twinToken={ckBtcToken.twinToken}
	/>
{/if}
