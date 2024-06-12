<script lang="ts">
	import IcReceiveCkEthereum from '$icp/components/receive/IcReceiveCkEthereum.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveICP.svelte';
	import IcReceiveCkBTC from '$icp/components/receive/IcReceiveCkBTC.svelte';
	import IcReceiveIcrc from '$icp/components/receive/IcReceiveIcrc.svelte';
	import type { Token } from '$lib/types/token';
	import {
		isTokenCkBtcLedger,
		isTokenCkErc20Ledger,
		isTokenCkEthLedger
	} from '$icp/utils/ic-send.utils';
	import type { IcToken } from '$icp/types/ic';
	import { setContext } from 'svelte';
	import {
		initReceiveTokenContext,
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	export let token: Token;

	setContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY, initReceiveTokenContext(token));

	let ckEthereum = false;
	$: ckEthereum = isTokenCkEthLedger(token as IcToken) || isTokenCkErc20Ledger(token as IcToken);

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger(token as IcToken);

	let icrc = false;
	$: icrc = token.standard === 'icrc';
</script>

{#if ckEthereum}
	<IcReceiveCkEthereum />
{:else if ckBTC}
	<IcReceiveCkBTC />
{:else if icrc}
	<IcReceiveIcrc />
{:else}
	<IcReceiveIcp />
{/if}
