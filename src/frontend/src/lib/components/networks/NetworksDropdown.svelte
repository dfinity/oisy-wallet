<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import MainnetNetwork from '$lib/components/networks/MainnetNetwork.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { NETWORKS_SWITCHER_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network as NetworkType, NetworkId } from '$lib/types/network';

	export let disabled = false;
	export let selectedNetwork: NetworkType | undefined = undefined;

	const dispatch = createEventDispatcher();

	let dropdown: Dropdown | undefined;

	let mainnetTokensUsdBalance: number;
	$: mainnetTokensUsdBalance = $networksMainnets.reduce(
		(acc, { id }) => acc + ($enabledMainnetTokensUsdBalancesPerNetwork[id] ?? 0),
		0
	);

	const onIcSelected = ({ detail: networkId }: CustomEvent<NetworkId>) => {
		dropdown?.close();

		dispatch('icSelected', networkId);
	};
</script>

<Dropdown
	bind:this={dropdown}
	ariaLabel={$i18n.networks.title}
	testId={NETWORKS_SWITCHER_DROPDOWN}
	{disabled}
	asModalOnMobile
>
	{#if nonNullish(selectedNetwork)}
		<NetworkLogo network={selectedNetwork} size="xs" />
	{:else}
		<Logo src={chainFusion} size="xs" />
	{/if}

	<span class="hidden md:block">{selectedNetwork?.name ?? $i18n.networks.chain_fusion}</span>

	<svelte:fragment slot="title">{$i18n.networks.filter}</svelte:fragment>

	<div slot="items">
		<NetworkButton
			id={undefined}
			name={$i18n.networks.chain_fusion}
			icon={chainFusion}
			usdBalance={mainnetTokensUsdBalance}
			on:icSelected={onIcSelected}
		/>

		<ul class="flex list-none flex-col">
			{#each $networksMainnets as network (network.id)}
				<li transition:slide={SLIDE_EASING}
					><MainnetNetwork {network} on:icSelected={onIcSelected} /></li
				>
			{/each}
		</ul>

		{#if $testnetsEnabled}
			<span class="my-5 flex px-3 font-bold" transition:slide={SLIDE_EASING}
				>{$i18n.networks.test_networks}</span
			>

			<ul class="flex list-none flex-col" transition:slide={SLIDE_EASING}>
				{#each $networksTestnets as network (network.id)}
					<li transition:slide={SLIDE_EASING}><Network {network} on:icSelected={onIcSelected} /></li
					>
				{/each}
			</ul>
		{/if}
	</div>
</Dropdown>
