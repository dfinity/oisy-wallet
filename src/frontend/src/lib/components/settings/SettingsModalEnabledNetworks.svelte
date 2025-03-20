<script lang="ts">
	import { Checkbox, Toggle } from '@dfinity/gix-components';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import SettingsList from '$lib/components/settings/SettingsList.svelte';
	import SettingsListItem from '$lib/components/settings/SettingsListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { userProfileVersion, userSettings } from '$lib/derived/user-profile.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import { setUserShowTestnets } from '$lib/api/backend.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { emit } from '$lib/utils/events.utils';
	import { modalStore } from '$lib/stores/modal.store';
	import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
	import { testnets } from '$lib/derived/testnets.derived';

	let enabledNetworksData: { [id: symbol]: boolean };
	$: enabledNetworksData = { ...$userSettings?.settings?.enabledNetworks };

	let enabledTestnet: boolean;
	$: enabledTestnet = $testnets;
	const enabledTestnetInitial = $testnets;

	let isModified: boolean;
	$: isModified = (() => {
		if (enabledTestnet !== enabledTestnetInitial) {
			return true;
		}
		return false;
	})();

	let mainnetsList: Network[];
	$: mainnetsList = SUPPORTED_NETWORKS.filter((n) => n.env === 'mainnet');

	let testnetsList: Network[];
	$: testnetsList = SUPPORTED_NETWORKS.filter((n) => n.env === 'testnet');

	const toggleTestnets = async () => {
		enabledTestnet = !enabledTestnet;
	};
	const toggleNetwork = (network: Network) => {
		// todo: call service to toggle network
	};
	let saveLoading: boolean;
	$: saveLoading = false;

	const save = async () => {
		saveLoading = true;
		await setUserShowTestnets({
			showTestnets: enabledTestnet,
			identity: $authIdentity,
			currentUserVersion: $userProfileVersion
		});
		emit({ message: 'oisyRefreshUserProfile' });
		modalStore.close();
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
					bind:checked={enabledTestnet}
					on:nnsChange={toggleTestnets}
				>
					{$i18n.settings.text.enable_testnets}
				</Checkbox>
			</div></svelte:fragment
		>

		{#each mainnetsList as network}
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

	{#if enabledTestnet}
		<SettingsList>
			<svelte:fragment slot="title">{$i18n.settings.text.testnets}</svelte:fragment>

			{#each testnetsList as network}
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
