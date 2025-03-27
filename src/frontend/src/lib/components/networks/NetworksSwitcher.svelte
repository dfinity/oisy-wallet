<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
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
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { modalStore } from '$lib/stores/modal.store';
	import { SettingsModalType } from '$lib/enums/settings-modal-types';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';

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

		<span class="my-5 flex px-3 font-bold">{$i18n.networks.test_networks}</span>

		{#if $testnets}
			<ul class="flex list-none flex-col">
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
						goto('/settings');
						dropdown?.close();
						// a small delay is needed for the opening of the modal after page switching
						setTimeout(() => modalStore.openSettings(SettingsModalType.ENABLED_NETWORKS), 1);
					}}><IconManage /><span class="-mt-1">{$i18n.tokens.manage.text.manage_list}</span></Button
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
