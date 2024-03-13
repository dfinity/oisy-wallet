<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import IcSendBtcNetwork from '$icp/components/send/IcSendBtcNetwork.svelte';
	import { isNetworkIdBTC } from '$icp/utils/ic-send.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { ckETHTwinToken } from '$icp-eth/derived/cketh.derived';

	export let networkId: NetworkId | undefined = undefined;
</script>

{#if nonNullish(networkId)}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">Network</svelte:fragment>
		{#if isNetworkIdBTC(networkId)}
			<IcSendBtcNetwork />
		{:else if isNetworkIdEthereum(networkId)}
			{$ckETHTwinToken.name}
		{:else}
			Internet Computer
		{/if}
	</Value>
{/if}
