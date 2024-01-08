<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import IcSendBtcNetwork from '$icp/components/send/IcSendBtcNetwork.svelte';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';

	export let networkId: NetworkId | undefined = undefined;
</script>

{#if nonNullish(networkId)}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">Network</svelte:fragment>
		{#if networkId === BTC_NETWORK_ID}
			<IcSendBtcNetwork />
		{:else}
			Internet Computer
		{/if}
	</Value>
{/if}
