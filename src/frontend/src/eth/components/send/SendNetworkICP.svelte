<script lang="ts">
	import { getContext } from 'svelte';
	import SendNetwork from '$eth/components/send/SendNetwork.svelte';
	import type { EthereumNetwork } from '$eth/types/network';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import type { Network } from '$lib/types/network';

	export let network: Network | undefined = undefined;
	export let destination: string | undefined = undefined;
	// TODO: to be removed once minterInfo breaking changes have been executed on mainnet
	export let sourceNetwork: EthereumNetwork;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let icp = false;
	$: icp = isErc20Icp($sendToken);
</script>

{#if icp}
	<SendNetwork bind:network {destination} {sourceNetwork} />
{/if}
