<script lang="ts">
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import SendNetworkICPText from '$eth/components/send/SendNetworkICPText.svelte';
	import type { Token } from '$lib/types/token';
	import { isErc20Icp } from '$eth/utils/token.utils';

	export let network: Network | undefined = undefined;
	export let token: Token;

	let icp = false;
	$: icp = isErc20Icp(token);
</script>

{#if nonNullish(network)}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">Network</svelte:fragment>
		{#if isNetworkICP(network)}
			<SendNetworkICPText erc20Icp={icp} />
		{:else}
			Ethereum
		{/if}
	</Value>
{/if}
