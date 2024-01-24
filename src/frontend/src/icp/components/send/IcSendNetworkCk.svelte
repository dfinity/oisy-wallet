<script lang="ts">
	import IcSendNetwork from './IcSendNetwork.svelte';
	import type { NetworkId } from '$lib/types/network';
	import type { IcToken } from '$icp/types/ic';
	import { isTokenCkBtcLedger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
	import { token } from '$lib/derived/token.derived';

	export let networkId: NetworkId | undefined = undefined;
	export let destination: string | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($token as IcToken);

	let ckETH = false;
	$: ckETH = isTokenCkEthLedger($token as IcToken);
</script>

{#if ckBTC || ckETH}
	<IcSendNetwork
		bind:networkId
		bind:destination
		dropdownNetworkBitcoin={ckBTC}
		dropdownNetworkEthereum={ckETH}
	/>
{/if}
