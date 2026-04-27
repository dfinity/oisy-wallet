<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import AddCustomNetworkModal from '$eth/components/networks/AddCustomNetworkModal.svelte';
	import SettingsModalEnabledNetworks from '$lib/components/settings/SettingsModalEnabledNetworks.svelte';
	import { SETTINGS_NETWORKS_MODAL } from '$lib/constants/test-ids.constants';
	import { modalSettingsData } from '$lib/derived/modal.derived';
	import { SettingsModalType as SettingsModalEnum } from '$lib/enums/settings-modal-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let settingsType = $derived($modalSettingsData);

	let modalTitle = $derived(
		settingsType === SettingsModalEnum.ENABLED_NETWORKS ? $i18n.settings.text.active_networks : ''
	);
</script>

<!-- we add an if here because theres plans to have multiple settings open as a modal -->
<!-- to add a new type, extend the SettingsModalType enum and add a condition below -->
<!-- Types that bring their own modal wrapper (e.g. the WizardModal in -->
<!-- AddCustomNetworkModal) must be rendered outside the shared <Modal> so we -->
<!-- don't double-wrap. -->
{#if settingsType === SettingsModalEnum.ADD_CUSTOM_NETWORK}
	<AddCustomNetworkModal onClose={modalStore.close} />
{:else}
	<Modal onClose={modalStore.close} testId={SETTINGS_NETWORKS_MODAL}>
		{#snippet title()}{modalTitle}{/snippet}

		{#if settingsType === SettingsModalEnum.ENABLED_NETWORKS}
			<SettingsModalEnabledNetworks />
		{/if}
	</Modal>
{/if}
