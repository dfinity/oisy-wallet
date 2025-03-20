<script lang="ts">
	import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import {
		SOLANA_MAINNET_NETWORK_ID,
		SOLANA_DEVNET_NETWORK_ID
	} from '$env/networks/networks.sol.env';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import { BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env.js';
	import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import type { Network } from '$lib/types/network';
	import { logoSizes } from '$lib/constants/components.constants';

	export let numberOfIcons: number = 4;

	// todo: take from store
	const networks = {
		[ETHEREUM_NETWORK_ID]: {
			enabled: true,
			isTestnet: false
		},
		[SEPOLIA_NETWORK_ID]: {
			enabled: true,
			isTestnet: true
		},
		[SOLANA_MAINNET_NETWORK_ID]: {
			enabled: true,
			isTestnet: false
		},
		[SOLANA_DEVNET_NETWORK_ID]: {
			enabled: true,
			isTestnet: true
		},
		[BTC_MAINNET_NETWORK_ID]: {
			enabled: true,
			isTestnet: false
		},
		[BTC_TESTNET_NETWORK_ID]: {
			enabled: true,
			isTestnet: true
		}
	};

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
	$: enabledList = getEnabledList(networks);

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
