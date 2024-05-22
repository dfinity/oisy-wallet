<script lang="ts">
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import BitcoinKYTFee from '$icp/components/fee/BitcoinKYTFee.svelte';
	import type { NetworkId } from '$lib/types/network';
	import BitcoinEstimatedFee from '$icp/components/fee/BitcoinEstimatedFee.svelte';
	import EthereumEstimatedFee from '$icp/components/fee/EthereumEstimatedFee.svelte';
	import CkErc20TokenFee from '$icp/components/fee/CkErc20TokenFee.svelte';
	import { isTokenCkErc20Ledger } from '$icp/utils/ic-send.utils';
	import { token } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';

	export let networkId: NetworkId | undefined = undefined;

	let ckEr20 = false;
	$: ckEr20 = isTokenCkErc20Ledger($token as IcToken);
</script>

{#if ckEr20}
	<CkErc20TokenFee {networkId} />
{:else}
	<IcTokenFee />
{/if}

<BitcoinEstimatedFee />
<BitcoinKYTFee {networkId} />
<EthereumEstimatedFee {networkId} />
