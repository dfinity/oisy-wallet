<script lang="ts">
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import type { Network } from '$lib/types/network';
	import { logoSizes } from '$lib/constants/components.constants';

	export let numberOfIcons: number = 4;

	// todo: type networks correcty
	export let enabledNetworks: any = {};

	// todo: type networks correcty
	const getEnabledList = (networks: any) => {
		const enabled = Object.getOwnPropertySymbols(networks ?? {})
			.map((k) => ({ key: k, value: networks[k] }))
			.filter(({ value }) => value.enabled);

		return enabled.map((n) => {
			const { key: netId } = n;
			return SUPPORTED_NETWORKS.find((sn) => sn.id.toString() === netId.toString());
		}) as Network[];
	};

	let enabledList: Network[];
	$: enabledList = getEnabledList(enabledNetworks);

	let previewList: Network[];
	$: previewList = enabledList.slice(0, numberOfIcons);
</script>

<div class="mr-2 mt-1 flex flex-row">
	{#each previewList as network}
		<div class="-ml-1 flex">
			<NetworkLogo size="xxs" {network} blackAndWhite />
		</div>
	{/each}
	{#if previewList.length < enabledList.length}
		<div
			class="-ml-1 flex items-center justify-center overflow-hidden rounded-full bg-primary text-center text-xs ring-1 ring-primary"
			style={`width: ${logoSizes.xxs}; height: ${logoSizes.xxs}; transition: opacity 0.15s ease-in;`}
		>
			+{enabledList.length - previewList.length}
		</div>
	{/if}
</div>
