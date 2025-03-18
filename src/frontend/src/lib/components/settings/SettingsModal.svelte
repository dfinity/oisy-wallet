<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import SettingsModalEnabledNetworks from '$lib/components/settings/SettingsModalEnabledNetworks.svelte';
	import { ABOUT_WHY_OISY_MODAL } from '$lib/constants/test-ids.constants';
	import { modalSettingsData } from '$lib/derived/modal.derived';
	import { type SettingsModalType , SettingsModalType as SettingsModalEnum } from '$lib/enums/settings-modal-types';
	import { modalStore } from '$lib/stores/modal.store';
	
	let settingsType: SettingsModalType;
	$: settingsType = $modalSettingsData;
</script>

<Modal on:nnsClose={modalStore.close} testId={ABOUT_WHY_OISY_MODAL}>
	<svelte:fragment slot="title">{settingsType ?? ''}</svelte:fragment>

	<!-- we add an if here because theres plans to have multiple settings open as a modal -->
	<!-- to add a new type, extend the SettingsModalType enum and add a condition below -->
	{#if settingsType === SettingsModalEnum.ENABLED_NETWORKS}
		<SettingsModalEnabledNetworks />
	{/if}
</Modal>
