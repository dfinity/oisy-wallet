<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import IcSendBtcNetwork from '$icp/components/send/IcSendBtcNetwork.svelte';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import Logo from '$lib/components/ui/Logo.svelte';
	import icpLight from '$icp/assets/icp_light.svg';
	import bitcoin from '$icp/assets/bitcoin.svg';
	import eth from '$icp-eth/assets/eth.svg';
	import { i18n } from '$lib/stores/i18n.store';

	export let networkId: NetworkId | undefined = undefined;

	let showDestinationNetwork: boolean;
	$: showDestinationNetwork =
		nonNullish(networkId) && (isNetworkIdBitcoin(networkId) || isNetworkIdEthereum(networkId));
</script>

<Value ref="network" element="div">
	<svelte:fragment slot="label"
		>{#if showDestinationNetwork}{$i18n.send.text.source_network}{:else}{$i18n.send.text
				.network}{/if}</svelte:fragment
	>
	<span class="flex gap-1">
		Internet Computer <Logo src={icpLight} size="small" alt={`Internet Computer logo`} />
	</span>
</Value>

{#if showDestinationNetwork}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">{$i18n.send.text.destination_network}</svelte:fragment>
		<span class="flex gap-1">
			{#if nonNullish(networkId) && isNetworkIdBitcoin(networkId)}
				<IcSendBtcNetwork {networkId} /> <Logo src={bitcoin} size="small" alt={`Bitcoin logo`} />
			{:else if nonNullish(networkId) && isNetworkIdEthereum(networkId)}
				{$ckEthereumTwinToken.network.name}
				<Logo
					src={$ckEthereumTwinToken.network.icon ?? eth}
					size="small"
					alt={`${$ckEthereumTwinToken.network.name} logo`}
				/>
			{/if}
		</span>
	</Value>
{/if}
