<script lang="ts">
	import SendNetwork from '$eth/components/send/SendNetwork.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let network: Network | undefined = undefined;
	export let destination: string | undefined = undefined;
	// TODO: to be removed once minterInfo breaking changes have been executed on mainnet
	export let sourceNetwork: EthereumNetwork;

	let icp = false;
	$: icp = isErc20Icp(token);
</script>

{#if icp}
	<SendNetwork {token} bind:network {destination} {sourceNetwork} />
{/if}
