<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import SendNetwork from './SendNetwork.svelte';
	import type { Network } from '$lib/types/network';
	import SendNetworkICPText from '$eth/components/send/SendNetworkICPText.svelte';

	export let token: Token;
	export let network: Network | undefined = undefined;
	export let destination: string | undefined = undefined;

	let icp = false;
	$: icp = isErc20Icp(token);

	let eth = false;
	$: eth = token.standard === 'ethereum';
</script>

{#if icp || eth}
	<SendNetwork bind:network {destination} disabled={eth}>
		<SendNetworkICPText erc20Icp={icp} slot="icp-network" />
	</SendNetwork>
{/if}
