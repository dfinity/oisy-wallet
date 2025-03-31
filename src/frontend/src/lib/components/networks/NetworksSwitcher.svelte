<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import MainnetNetwork from '$lib/components/networks/MainnetNetwork.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { NETWORKS_SWITCHER_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { SettingsModalType } from '$lib/enums/settings-modal-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let disabled = false;

	let dropdown: Dropdown | undefined;

	let mainnetTokensUsdBalance: number;
	$: mainnetTokensUsdBalance = $networksMainnets.reduce(
		(acc, { id }) => acc + ($enabledMainnetTokensUsdBalancesPerNetwork[id] ?? 0),
		0
	);
</script>

<Dropdown
	bind:this={dropdown}
	ariaLabel={$i18n.networks.title}
	testId={NETWORKS_SWITCHER_DROPDOWN}
	{disabled}
	asModalOnMobile
>
	{#if nonNullish($selectedNetwork)}
		<NetworkLogo network={$selectedNetwork} size="xs" />
	{:else}
		<Logo src={chainFusion} size="xs" />
	{/if}
	<span class="hidden md:block">{$selectedNetwork?.name ?? $i18n.networks.chain_fusion}</span>

	<svelte:fragment slot="title">{$i18n.networks.filter}</svelte:fragment>
	<div slot="items">
		<NetworkButton
			id={undefined}
			name={$i18n.networks.chain_fusion}
			icon={chainFusion}
			usdBalance={mainnetTokensUsdBalance}
			on:icSelected={dropdown.close}
		/>

		<ul class="flex list-none flex-col">
			{#each $networksMainnets as network (network.id)}
				<li transition:slide={SLIDE_EASING}
					><MainnetNetwork {network} on:icSelected={dropdown.close} /></li
				>
			{/each}
		</ul>

		{#if $testnetsEnabled}
			<span class="my-5 flex px-3 font-bold" transition:slide={SLIDE_EASING}
				>{$i18n.networks.test_networks}</span
			>

			<ul class="flex list-none flex-col" transition:slide={SLIDE_EASING}>
				{#each $networksTestnets as network (network.id)}
					<li transition:slide={SLIDE_EASING}
						><Network {network} on:icSelected={dropdown.close} /></li
					>
				{/each}
			</ul>
		{/if}

		<div class="mb-2 ml-2 mt-5 flex flex-row justify-between text-nowrap">
			<span class="flex">
				<Button
					link
					on:click={() => {
						dropdown?.close();
						modalStore.openSettings(SettingsModalType.ENABLED_NETWORKS);
					}}><IconManage />{$i18n.networks.manage}</Button
				>
			</span>
			<span class="ml-4 mr-2 flex text-nowrap text-right text-base">
				{replacePlaceholders($i18n.networks.number_of_enabled, {
					$numNetworksEnabled: `${$networksMainnets.length + $networksTestnets.length}`,
					$numNetworksTotal: `${SUPPORTED_NETWORKS.length}`
				})}</span
			>
		</div>
	</div>
</Dropdown>
