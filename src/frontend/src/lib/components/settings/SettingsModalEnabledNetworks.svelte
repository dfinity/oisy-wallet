<script lang="ts">
	import { Checkbox, KeyValuePair, Toggle } from '@dfinity/gix-components';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import { testnetsEnabled, enabledNetworks } from '$lib/derived/settings.derived';
	import { enabledNetworksStore, testnetsStore } from '$lib/stores/settings.store';
	import type { Network } from '$lib/types/network';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { userSettings } from '$lib/derived/user-profile.derived';
	import SettingsList from '$lib/components/settings/SettingsList.svelte';
	import SettingsListItem from '$lib/components/settings/SettingsListItem.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	let testnetsEnabledChecked: boolean;
	$: testnetsEnabledChecked = $userSettings?.settings?.testnetsEnabled ?? false;

	let enabledNetworksData: { [id: symbol]: boolean };
	$: enabledNetworksData = { ...$userSettings?.settings?.enabledNetworks };

	const toggleTestnets = async () => {
		testnetsStore.set({ key: 'testnets', value: { enabled: !testnetsEnabledChecked } });
	};

	const toggleNetwork = (network: Network) => {
		enabledNetworksData[network.id] = !enabledNetworksData?.[network.id] ?? false;
	};

	const save = async () => {
		enabledNetworksStore.set({
			key: 'enabledNetworks',
			value: enabledNetworksData
		});

		modalStore.close();
	};

	let selected: number;
	$: selected = 0;
</script>

<div class="p-6">
	<SettingsList>
		<svelte:fragment slot="title">Mainnets</svelte:fragment>
		<svelte:fragment slot="title-action"
			><div class="font-bold"
				><Checkbox
					text="inline"
					inputId="smth"
					checked={testnetsEnabledChecked}
					on:nnsChange={toggleTestnets}
				>
					Enable Testnets
				</Checkbox>
			</div></svelte:fragment
		>

		{#each $networksMainnets as network}
			<SettingsListItem>
				<svelte:fragment slot="key"
					><NetworkLogo {network} blackAndWhite size="xxs" />
					<span class="ml-2 flex">{network.name}</span></svelte:fragment
				>
				<svelte:fragment slot="value"
					><Toggle
						ariaLabel="Enable/Disable"
						checked={enabledNetworksData?.[network.id]}
						on:nnsToggle={() => toggleNetwork(network)}
					/></svelte:fragment
				>
			</SettingsListItem>
		{/each}
	</SettingsList>

	{#if $testnetsEnabled}
		<SettingsList>
			<svelte:fragment slot="title">Testnets</svelte:fragment>

			{#each $networksTestnets as network}
				<SettingsListItem>
					<svelte:fragment slot="key"
						><NetworkLogo {network} blackAndWhite size="xxs" />
						<span class="ml-2 flex">{network.name}</span></svelte:fragment
					>
					<svelte:fragment slot="value"
						><Toggle
							ariaLabel="Enable/Disable"
							checked={enabledNetworksData?.[network.id]}
							on:nnsToggle={() => toggleNetwork(network)}
						/></svelte:fragment
					>
				</SettingsListItem>
			{/each}
		</SettingsList>
	{/if}
</div>
<ContentWithToolbar>
	<ButtonGroup slot="toolbar">
		<ButtonCloseModal />
		<Button on:click={save}>{$i18n.core.text.save}</Button>
	</ButtonGroup>
</ContentWithToolbar>
