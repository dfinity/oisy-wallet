<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { modalSettingsData, modalSettingsState } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { ABOUT_WHY_OISY_MODAL } from '$lib/constants/test-ids.constants';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import type { SettingsModalType } from '$lib/types/settings';
	import SettingsModalEnabledNetworks from '$lib/components/settings/SettingsModalEnabledNetworks.svelte';
	import SettingsModalSession from '$lib/components/settings/SettingsModalSession.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let settingsType: SettingsModalType;
	$: settingsType = $modalSettingsData;
</script>

<Modal on:nnsClose={modalStore.close} testId={ABOUT_WHY_OISY_MODAL}>
	<svelte:fragment slot="title">{settingsType ?? ''}</svelte:fragment>

	{#if settingsType === 'sessionDuration'}
		<SettingsModalSession />
	{:else if settingsType === 'enabledNetworks'}
		<SettingsModalEnabledNetworks />
	{/if}
</Modal>
