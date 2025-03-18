<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { modalSettingsData, modalSettingsState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { ABOUT_WHY_OISY_MODAL } from '$lib/constants/test-ids.constants';
	import SettingsModalEnabledNetworks from '$lib/components/settings/SettingsModalEnabledNetworks.svelte';
	import SettingsModalSession from '$lib/components/settings/SettingsModalSession.svelte';
	import type { SettingsModalType } from '$lib/enums/settings-modal-types';
	import { SettingsModalType as SettingsModalEnum } from '$lib/enums/settings-modal-types';

	let settingsType: SettingsModalType;
	$: settingsType = $modalSettingsData;
</script>

<Modal on:nnsClose={modalStore.close} testId={ABOUT_WHY_OISY_MODAL}>
	<svelte:fragment slot="title">{settingsType ?? ''}</svelte:fragment>

	{#if settingsType === SettingsModalEnum.SESSION_DURATION}
		<SettingsModalSession />
	{:else if settingsType === SettingsModalEnum.ENABLED_NETWORKS}
		<SettingsModalEnabledNetworks />
	{/if}
</Modal>
