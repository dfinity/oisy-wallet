<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { ERC20_CONTRACT_ICP, ERC20_CONTRACT_ICP_GOERLI } from '$env/tokens/tokens.erc20.env';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthereumNetwork } from '$eth/types/network';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isNetworkICP } from '$lib/utils/network.utils';

	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let token: Token;

	let nativeIcp: boolean;
	$: nativeIcp =
		isNetworkICP(targetNetwork) &&
		[ERC20_CONTRACT_ICP.address, ERC20_CONTRACT_ICP_GOERLI.address].includes(
			(token as Erc20Token)?.address
		);
</script>

<Value ref="source-network" element="div">
	<svelte:fragment slot="label"
		>{#if nonNullish(targetNetwork)}{$i18n.send.text.source_network}{:else}{$i18n.send.text
				.network}{/if}</svelte:fragment
	>
	<NetworkWithLogo network={sourceNetwork} />
</Value>

{#if nonNullish(targetNetwork)}
	<Value ref="target-network" element="div">
		<svelte:fragment slot="label">{$i18n.send.text.destination_network}</svelte:fragment>
		<span class="flex gap-1">
			{#if nativeIcp}
				{$i18n.send.text.convert_to_native_icp}
				<NetworkLogo network={ICP_NETWORK} />
			{:else}
				{targetNetwork.name}
				<NetworkLogo network={targetNetwork} />
			{/if}
		</span>
	</Value>
{/if}
