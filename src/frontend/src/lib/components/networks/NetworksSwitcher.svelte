<script lang="ts">
	import { slide } from 'svelte/transition';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import IconMorePlain from '$lib/components/icons/IconMorePlain.svelte';
	import MainnetNetwork from '$lib/components/networks/MainnetNetwork.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { NETWORKS_SWITCHER_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { IconSettings } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { SettingsModalType } from '$lib/enums/settings-modal-types';
	import { goto } from '$app/navigation';

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
>
	{#if nonNullish($selectedNetwork)}
		<NetworkLogo network={$selectedNetwork} size="xs" />
	{:else}
		<Logo src={chainFusion} />
	{/if}
	<span class="hidden md:block">{$selectedNetwork?.name ?? $i18n.networks.chain_fusion}</span>

	<div slot="items">
		<ul class="flex list-none flex-col font-normal">
			<li class="border-brand-subtle-20">
				<NetworkButton
					id={undefined}
					name={$i18n.networks.chain_fusion}
					icon={chainFusion}
					usdBalance={mainnetTokensUsdBalance}
					on:icSelected={dropdown.close}
				/>
			</li>

			{#each $networksMainnets as network}
				<li class="border-brand-subtle-20">
					<MainnetNetwork {network} on:icSelected={dropdown.close} />
				</li>
			{/each}

			{#if $testnets}
				{#each $networksTestnets as network}
					<li class="border-brand-subtle-20">
						<Network {network} on:icSelected={dropdown.close} />
					</li>
				{/each}
			{/if}
		</ul>

		<Button
			link
			styleClass="mt-5 ml-2 mb-2"
			on:click={() => {
				goto('/settings');
				dropdown?.close();
				// a small delay is enough for the opening of the modal to happen after page switching
				setTimeout(() => modalStore.openSettings(SettingsModalType.ENABLED_NETWORKS), 1);
			}}><IconSettings /><span class="-mt-1">{$i18n.tokens.manage.text.manage_list}</span></Button
		>
	</div>
</Dropdown>
