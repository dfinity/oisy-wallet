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

	let settingsType: SettingsModalType;
	$: settingsType = $modalSettingsData;

	let modalTitle: string;
	$: modalTitle =
		settingsType === SettingsModalEnum.ENABLED_NETWORKS ? $i18n.settings.text.active_networks : '';
</script>

<Modal on:nnsClose={modalStore.close} testId={SETTINGS_NETWORKS_MODAL}>
	<svelte:fragment slot="title">{modalTitle}</svelte:fragment>

	<!-- we add an if here because theres plans to have multiple settings open as a modal -->
	<!-- to add a new type, extend the SettingsModalType enum and add a condition below -->
	{#if settingsType === SettingsModalEnum.ENABLED_NETWORKS}
		<SettingsModalEnabledNetworks />
	{/if}
</Modal>
