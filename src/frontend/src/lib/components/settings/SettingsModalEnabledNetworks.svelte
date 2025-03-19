<script lang="ts">
	import { Checkbox, Toggle } from '@dfinity/gix-components';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import SettingsList from '$lib/components/settings/SettingsList.svelte';
	import SettingsListItem from '$lib/components/settings/SettingsListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { userSettings } from '$lib/derived/user-profile.derived';
	import type { Network } from '$lib/types/network';
	import { i18n } from '$lib/stores/i18n.store';

	let testnetsEnabledChecked: boolean;
	$: testnetsEnabledChecked = $userSettings?.settings?.testnetsEnabled ?? false;

	let enabledNetworksData: { [id: symbol]: boolean };
	$: enabledNetworksData = { ...$userSettings?.settings?.enabledNetworks };

	const toggleTestnets = async () => {
		// todo: call service to enable testnets
	};

	const toggleNetwork = (network: Network) => {
		// todo: call service to toggle network
	};
</script>

<ContentWithToolbar>
	<SettingsList>
		<svelte:fragment slot="title">{$i18n.settings.text.mainnets}</svelte:fragment>
		<svelte:fragment slot="title-action"
			><div class="font-bold"
				><Checkbox
					text="inline"
					inputId="smth"
					checked={testnetsEnabledChecked}
					on:nnsChange={toggleTestnets}
				>
					{$i18n.settings.text.enable_testnets}
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
			<svelte:fragment slot="title">{$i18n.settings.text.testnets}</svelte:fragment>

			{#each $networksTestnets as network}
				<SettingsListItem>
					<svelte:fragment slot="key"
						><span><NetworkLogo {network} blackAndWhite size="xxs" /></span>
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

	<ButtonCloseModal slot="toolbar" />
</ContentWithToolbar>
