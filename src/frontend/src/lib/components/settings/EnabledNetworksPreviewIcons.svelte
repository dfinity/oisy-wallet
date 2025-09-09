<script lang="ts">
	import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { userNetworks } from '$lib/derived/user-networks.derived';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { UserNetworks } from '$lib/types/user-networks';

	const numberOfIcons = 4;

	const getEnabledList = (networks: UserNetworks): Network[] =>
		Object.getOwnPropertySymbols(networks ?? {}).reduce<Network[]>((enabledList, symbol) => {
			const isEnabled = networks[symbol as NetworkId]?.enabled ?? false;

			if (isEnabled) {
				const network = SUPPORTED_NETWORKS.find((sn) => sn.id.toString() === symbol.toString());
				if (network) {
					enabledList.push(network);
				}
			}

			return enabledList;
		}, []);

	let enabledList: Network[] = $derived(getEnabledList($userNetworks));

	let previewList: Network[] = $derived(enabledList.slice(0, numberOfIcons));
</script>

<div class="mr-2 mt-1 flex flex-row">
	{#each previewList as network (network.id)}
		<div class="-ml-1 flex">
			<NetworkLogo {network} size="xxs" />
		</div>
	{/each}
	{#if enabledList.length > numberOfIcons}
		<div
			style={`width: ${logoSizes.xxs}; height: ${logoSizes.xxs}`}
			class="-ml-1 flex items-center justify-center overflow-hidden rounded-full bg-primary text-center text-xs ring-1 ring-primary transition-opacity duration-150"
		>
			+{enabledList.length - numberOfIcons}
		</div>
	{/if}
</div>
