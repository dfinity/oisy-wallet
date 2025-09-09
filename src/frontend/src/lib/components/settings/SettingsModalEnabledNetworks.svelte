<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import {
		SUPPORTED_MAINNET_NETWORKS,
		SUPPORTED_NETWORKS,
		SUPPORTED_TESTNET_NETWORKS
	} from '$env/networks/networks.env';
	import { setUserShowTestnets, updateUserNetworkSettings } from '$lib/api/backend.api';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ManageNetworkToggle from '$lib/components/networks/ManageNetworkToggle.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		SETTINGS_NETWORKS_MODAL_SAVE_BUTTON,
		SETTINGS_NETWORKS_MODAL_TESTNET_CHECKBOX,
		SETTINGS_NETWORKS_MODAL_TESTNETS_CONTAINER,
		SETTINGS_NETWORKS_MODAL_TESTNET_TOGGLE
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { userNetworks } from '$lib/derived/user-networks.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Network } from '$lib/types/network';
	import type { UserNetworks } from '$lib/types/user-networks';
	import { emit } from '$lib/utils/events.utils';
	import { isNetworkIdICP } from '$lib/utils/network.utils.js';

	const enabledNetworks = $state({ ...$userNetworks });
	const enabledNetworksInitial = { ...enabledNetworks };

	let enabledTestnet = $state($testnetsEnabled);
	const enabledTestnetInitial = enabledTestnet;

	const checkModified = ({
		enabledTestnet,
		enabledNetworks
	}: {
		enabledTestnet: boolean;
		enabledNetworks: UserNetworks;
	}) => {
		const testnetModified = enabledTestnet !== enabledTestnetInitial;

		const networkModified = SUPPORTED_NETWORKS.reduce((acc, { id }) => {
			const value = enabledNetworks[id]?.enabled ?? false;
			const initialValue = enabledNetworksInitial[id]?.enabled ?? false;

			return acc || value !== initialValue;
		}, false);

		return testnetModified || networkModified;
	};
	let isModified: boolean = $derived(checkModified({ enabledTestnet, enabledNetworks }));

	const toggleTestnets = () => {
		enabledTestnet = !enabledTestnet;
	};

	const toggleNetwork = ({ id, env }: Network) => {
		enabledNetworks[id] = {
			enabled: !enabledNetworks[id]?.enabled,
			isTestnet: env === 'testnet'
		};
	};

	let saveLoading = $state(false);

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
		// TODO: refactor this when we have a single method for both calls
		await loadUserProfile({ identity: $authIdentity, reload: true });

		await updateUserNetworkSettings({
			identity: $authIdentity,
			networks: enabledNetworks,
			currentUserVersion: $userProfileVersion
		});

		emit({ message: 'oisyRefreshUserProfile' });
		setTimeout(() => modalStore.close(), 750);
	};
</script>

<ContentWithToolbar>
	<div class="flex w-full justify-between">
		<h5 class="mb-4 flex">{$i18n.settings.text.networks}</h5>
		<div class="flex font-bold">
			<Checkbox
				inputId="toggle-testnets-switcher"
				testId={SETTINGS_NETWORKS_MODAL_TESTNET_CHECKBOX}
				text="inline"
				bind:checked={enabledTestnet}
				on:nnsChange={toggleTestnets}
			>
				{$i18n.settings.text.enable_testnets}
			</Checkbox>
		</div>
	</div>

	<List condensed={false} styleClass="mb-8" variant="styled">
		{#each SUPPORTED_MAINNET_NETWORKS as network (network.id)}
			<ListItem>
				<span class="flex">
					<NetworkLogo {network} size="xxs" />
					<span class="ml-2 flex">{network.name}</span>
				</span>
				<!-- We disable the ICP toggle, for simplicity in other components and implications we dont allow disabling ICP -->
				<ManageNetworkToggle
					checked={enabledNetworks[network.id]?.enabled ?? false}
					disabled={isNetworkIdICP(network.id)}
					on:nnsToggle={() => toggleNetwork(network)}
				/>
			</ListItem>
		{/each}
	</List>

	{#if enabledTestnet}
		<div class="w-full justify-between" data-tid={SETTINGS_NETWORKS_MODAL_TESTNETS_CONTAINER}>
			<h5 class="mb-4">{$i18n.networks.test_networks}</h5>
		</div>

		<List condensed={false} variant="styled">
			{#each SUPPORTED_TESTNET_NETWORKS as network (network.id)}
				<ListItem>
					<span class="flex">
						<NetworkLogo {network} size="xxs" />
						<span class="ml-2 flex">{network.name}</span>
					</span>
					<ManageNetworkToggle
						checked={enabledNetworks[network.id]?.enabled ?? false}
						disabled={isNetworkIdICP(network.id)}
						testId={`${SETTINGS_NETWORKS_MODAL_TESTNET_TOGGLE}-${network.id.description}`}
						on:nnsToggle={() => toggleNetwork(network)}
					/>
				</ListItem>
			{/each}
		</List>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCloseModal />
			<Button
				colorStyle="primary"
				disabled={!isModified || saveLoading || $isBusy}
				loading={saveLoading}
				loadingAsSkeleton={false}
				onclick={save}
				testId={SETTINGS_NETWORKS_MODAL_SAVE_BUTTON}>{$i18n.core.text.save}</Button
			>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
