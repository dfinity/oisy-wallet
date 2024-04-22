<script lang="ts">
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkETHMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import ConvertCkEthereumTransactionsListener from '$icp-eth/components/core/ConvertCkEthereumTransactionsListener.svelte';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { IcCkToken } from '$icp/types/ic';
	import { token } from '$lib/derived/token.derived';

	let minterCanisterId: CanisterIdText | undefined = undefined;
	$: minterCanisterId = ($token as IcCkToken).minterCanisterId;
</script>

<IcCkListener
	initFn={initCkETHMinterInfoWorker}
	token={$ckEthereumNativeToken}
	{minterCanisterId}
/>

<ConvertCkEthereumTransactionsListener />

<slot />
