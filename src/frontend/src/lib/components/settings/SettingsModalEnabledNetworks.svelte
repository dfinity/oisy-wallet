<script lang="ts">
	import { Checkbox, Toggle } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import {
		SUPPORTED_MAINNET_NETWORKS,
		SUPPORTED_NETWORKS,
		SUPPORTED_TESTNET_NETWORKS
	} from '$env/networks/networks.env';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { setUserShowTestnets, updateUserNetworkSettings } from '$lib/api/backend.api';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import SettingsList from '$lib/components/settings/SettingsList.svelte';
	import SettingsListItem from '$lib/components/settings/SettingsListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { userNetworks } from '$lib/derived/user-networks.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Network } from '$lib/types/network';
	import type { UserNetworks } from '$lib/types/user-networks';
	import { emit } from '$lib/utils/events.utils';

	let enabledNetworks = { ...$userNetworks };
	const enabledNetworksInitial = { ...$userNetworks };

	let enabledTestnet = $testnets;
	const enabledTestnetInitial = $testnets;

	const checkModified = ({
		enabledTestnet,
		enabledNetworks
	}: {
		enabledTestnet: boolean;
		enabledNetworks: UserNetworks;
	}) => {
		const testnetModified = enabledTestnet !== enabledTestnetInitial;

		const networkModified = SUPPORTED_NETWORKS.reduce((acc, k) => {
			const value = enabledNetworks[k.id]?.enabled ?? false;
			const initialValue = enabledNetworksInitial[k.id]?.enabled ?? false;

			return acc || value !== initialValue;
		}, false);

		return testnetModified || networkModified;
	};
	let isModified: boolean;
	$: isModified = checkModified({ enabledTestnet, enabledNetworks });

	const toggleTestnets = () => {
		enabledTestnet = !enabledTestnet;
	};

	const toggleNetwork = (network: Network) => {
		enabledNetworks[network.id] = {
			enabled: !enabledNetworks[network.id]?.enabled,
			isTestnet: network.env === 'testnet'
		};
	};

	let saveLoading = false;

	const save = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (!isModified) {
			return;
		}

		saveLoading = true;
		await setUserShowTestnets({
			showTestnets: enabledTestnet,
			identity: $authIdentity,
			currentUserVersion: $userProfileVersion
		});

		// we need to manually reload the profile in order to get the correct $userProfileVersion for the second call to update userNetworkSettings
		// todo: refactor this when we have a single method for both calls
		await loadUserProfile({ identity: $authIdentity, reload: true });

		await updateUserNetworkSettings({
			identity: $authIdentity,
			networks: enabledNetworks,
			currentUserVersion: $userProfileVersion
		});

		emit({ message: 'oisyRefreshUserProfile' });
		modalStore.close();
	};
</script>

<ContentWithToolbar>
	<SettingsList>
		<svelte:fragment slot="title">{$i18n.settings.text.networks}</svelte:fragment>
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

		{#each SUPPORTED_MAINNET_NETWORKS as network (network.id)}
			<SettingsListItem>
				<svelte:fragment slot="key"
					><NetworkLogo {network} blackAndWhite size="xxs" />
					<span class="ml-2 flex">{network.name}</span></svelte:fragment
				>
				<svelte:fragment slot="value">
					<!-- We disable the ICP toggle, for simplicity in other components and implications we dont allow disabling ICP -->
					<Toggle
						ariaLabel={enabledNetworks[network.id]?.enabled
							? $i18n.settings.text.disable_network
							: $i18n.settings.text.enable_network}
						checked={enabledNetworks[network.id]?.enabled ?? false}
						on:nnsToggle={() => toggleNetwork(network)}
						disabled={network.id === ICP_NETWORK_ID}
					/></svelte:fragment
				>
			</SettingsListItem>
		{/each}
	</SettingsList>

	{#if enabledTestnet}
		<SettingsList>
			<svelte:fragment slot="title">{$i18n.networks.test_networks}</svelte:fragment>

			{#each SUPPORTED_TESTNET_NETWORKS as network (network.id)}
				<SettingsListItem>
					<svelte:fragment slot="key"
						><span><NetworkLogo {network} blackAndWhite size="xxs" /></span>
						<span class="ml-2 flex">{network.name}</span></svelte:fragment
					>
					<svelte:fragment slot="value"
						><Toggle
							ariaLabel={enabledNetworks[network.id]?.enabled
								? $i18n.settings.text.disable_network
								: $i18n.settings.text.enable_network}
							checked={enabledNetworks[network.id]?.enabled ?? false}
							on:nnsToggle={() => toggleNetwork(network)}
						/></svelte:fragment
					>
				</SettingsListItem>
			{/each}
		</SettingsList>
	{/if}

	<ButtonGroup slot="toolbar">
		<ButtonCloseModal />
		<Button
			loading={saveLoading}
			colorStyle="primary"
			on:click={save}
			disabled={!isModified || saveLoading}>{$i18n.core.text.save}</Button
		>
	</ButtonGroup>
</ContentWithToolbar>
