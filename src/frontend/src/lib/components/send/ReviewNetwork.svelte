<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import bitcoin from '$icp/assets/bitcoin.svg';
	import eth from '$icp-eth/assets/eth.svg';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import SendBtcNetwork from '$lib/components/send/SendBtcNetwork.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	export let sourceNetwork: Network | undefined;
	export let destinationNetworkId: NetworkId | undefined = undefined;

	let isNetworkBitcoin: boolean;
	$: isNetworkBitcoin = isNetworkIdBitcoin(destinationNetworkId);

	let isNetworkEthereum: boolean;
	$: isNetworkEthereum = isNetworkIdEthereum(destinationNetworkId);

	let showDestinationNetwork: boolean;
	$: showDestinationNetwork = isNetworkBitcoin || isNetworkEthereum;
</script>

{#if nonNullish(sourceNetwork)}
	<Value ref="network" element="div">
		<svelte:fragment slot="label"
			>{#if showDestinationNetwork}{$i18n.send.text.source_network}{:else}{$i18n.send.text
					.network}{/if}</svelte:fragment
		>
		<TextWithLogo name={sourceNetwork.name} icon={sourceNetwork.icon} />
	</Value>
{/if}

{#if nonNullish(destinationNetworkId) && showDestinationNetwork}
	<Value ref="destination-network" element="div">
		<svelte:fragment slot="label">{$i18n.send.text.destination_network}</svelte:fragment>
		{#if isNetworkBitcoin}
			<span class="flex gap-1">
				<SendBtcNetwork networkId={destinationNetworkId} />
				<Logo
					src={bitcoin}
					alt={replacePlaceholders($i18n.core.alt.logo, {
						$name: $i18n.receive.bitcoin.text.bitcoin
					})}
				/>
			</span>
		{:else if isNetworkEthereum}
			<TextWithLogo
				name={$ckEthereumTwinToken.network.name}
				icon={$ckEthereumTwinToken.network.icon ?? eth}
			/>
		{/if}
	</Value>
{/if}
