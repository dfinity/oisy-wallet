<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import bitcoin from '$btc/assets/bitcoin.svg';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendBtcNetwork from '$lib/components/send/SendBtcNetwork.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	interface Props {
		sourceNetwork?: Network;
		destinationNetworkId?: NetworkId;
	}

	let { sourceNetwork, destinationNetworkId = undefined }: Props = $props();

	let isNetworkBitcoin = $derived(isNetworkIdBitcoin(destinationNetworkId));

	let isNetworkEthereum = $derived(isNetworkIdEthereum(destinationNetworkId));

	let showDestinationNetwork = $derived(isNetworkBitcoin || isNetworkEthereum);
</script>

{#if nonNullish(sourceNetwork)}
	<ModalValue ref="destination-network">
		{#snippet label()}
			{#if showDestinationNetwork}
				{$i18n.send.text.source_network}
			{:else}
				{$i18n.send.text.network}
			{/if}
		{/snippet}

		{#snippet mainValue()}
			<NetworkWithLogo network={sourceNetwork} />
		{/snippet}
	</ModalValue>
{/if}

{#if nonNullish(destinationNetworkId) && showDestinationNetwork}
	<ModalValue ref="destination-network">
		{#snippet label()}
			{$i18n.send.text.destination_network}
		{/snippet}

		{#snippet mainValue()}
			{#if isNetworkBitcoin}
				<span class="flex gap-1">
					<SendBtcNetwork networkId={destinationNetworkId} />
					<Logo
						alt={replacePlaceholders($i18n.core.alt.logo, {
							$name: $i18n.receive.bitcoin.text.bitcoin
						})}
						src={bitcoin}
					/>
				</span>
			{:else if isNetworkEthereum}
				<NetworkWithLogo network={$ckEthereumTwinToken.network} />
			{/if}
		{/snippet}
	</ModalValue>
{/if}
