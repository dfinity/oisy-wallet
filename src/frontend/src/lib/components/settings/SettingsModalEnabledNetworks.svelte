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
</script>

<div class="p-6">
	<div class="flex w-full flex-row justify-between">
		<h5 class="mb-4 flex">Mainnets</h5>
		<div class="font-bold"
			><Checkbox
				text="inline"
				inputId="smth"
				checked={testnetsEnabledChecked}
				on:nnsChange={toggleTestnets}
			>
				Enable Testnets
			</Checkbox>
		</div>
	</div>

	<div class="mb-8 flex flex-col gap-1 px-1">
		{#each $networksMainnets as network}
			<div class="border-b-1 flex w-full border-brand-subtle-20 py-1">
				<KeyValuePair>
					<span slot="key" class="flex w-full flex-row"
						><NetworkLogo {network} blackAndWhite size="xxs" />
						<span class="ml-2 flex">{network.name}</span></span
					>
					<span slot="value"
						><Toggle
							ariaLabel="Enable/Disable"
							checked={enabledNetworksData?.[network.id]}
							on:nnsToggle={() => toggleNetwork(network)}
						/></span
					>
				</KeyValuePair>
			</div>
		{/each}
	</div>

	{#if $testnetsEnabled}
		<h5 class="mb-4">Testnets</h5>
		<div class="mb-8 flex flex-col gap-1 px-1">
			{#each $networksTestnets as network}
				<div class="border-b-1 flex w-full border-brand-subtle-20 py-1">
					<KeyValuePair>
						<span slot="key" class="flex w-full flex-row"
							><NetworkLogo {network} blackAndWhite size="xxs" />
							<span class="ml-2 flex">{network.name}</span></span
						>
						<span slot="value"
							><Toggle
								ariaLabel="Test"
								checked={enabledNetworksData?.[network.id]}
								on:nnsToggle={() => toggleNetwork(network)}
							/></span
						>
					</KeyValuePair>
				</div>
			{/each}
		</div>
	{/if}
</div>
<ContentWithToolbar>
	<ButtonGroup slot="toolbar">
		<ButtonCloseModal />
		<Button on:click={save}>{$i18n.core.text.save}</Button>
	</ButtonGroup>
</ContentWithToolbar>
