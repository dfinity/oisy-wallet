<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import SettingsModalEnabledNetworks from '$lib/components/settings/SettingsModalEnabledNetworks.svelte';
	import { SETTINGS_NETWORKS_MODAL } from '$lib/constants/test-ids.constants';
	import { modalSettingsData } from '$lib/derived/modal.derived';
	import {
		type SettingsModalType,
		SettingsModalType as SettingsModalEnum
	} from '$lib/enums/settings-modal-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let settingsType: SettingsModalType = $derived($modalSettingsData);

	let modalTitle: string = $derived(
		settingsType === SettingsModalEnum.ENABLED_NETWORKS ? $i18n.settings.text.active_networks : ''
	);
</script>

<Modal testId={SETTINGS_NETWORKS_MODAL} on:nnsClose={modalStore.close}>
	{#snippet title()}
		{modalTitle}
	{/snippet}

	<!-- we add an if here because theres plans to have multiple settings open as a modal -->
	<!-- to add a new type, extend the SettingsModalType enum and add a condition below -->
	{#if settingsType === SettingsModalEnum.ENABLED_NETWORKS}
		<SettingsModalEnabledNetworks />
	{/if}
</Modal>
