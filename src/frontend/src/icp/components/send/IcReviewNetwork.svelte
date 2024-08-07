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
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';

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
	<TextWithLogo name="Internet Computer" icon={icpLight} />
</Value>

{#if showDestinationNetwork}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">{$i18n.send.text.destination_network}</svelte:fragment>
		{#if nonNullish(networkId) && isNetworkIdBitcoin(networkId)}
			<span class="flex gap-1">
				<IcSendBtcNetwork {networkId} />
				<Logo src={bitcoin} alt={`Bitcoin logo`} />
			</span>
		{:else if nonNullish(networkId) && isNetworkIdEthereum(networkId)}
			<TextWithLogo
				name={$ckEthereumTwinToken.network.name}
				icon={$ckEthereumTwinToken.network.icon ?? eth}
			/>
		{/if}
	</Value>
{/if}
