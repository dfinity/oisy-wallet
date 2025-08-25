<script lang="ts">
	import { WizardModal } from '@dfinity/gix-components';
	import type { Writable } from 'svelte/store';
	import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
	import { allSendWizardSteps } from '$lib/config/send.config';
	import { SEND_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { SendDestinationTab } from '$lib/types/send';

	let {
		destination,
		activeSendDestinationTab,
		selectedContact = $bindable()
	}: {
		destination: string;
		activeSendDestinationTab: SendDestinationTab;
		selectedContact: Writable<ContactUi>;
	} = $props();

	const steps = allSendWizardSteps({ i18n: $i18n });

	let currentStep = $state(steps[0]);
</script>

<WizardModal {steps} testId={SEND_TOKENS_MODAL} bind:currentStep>
	<SendDestinationWizardStep
		{activeSendDestinationTab}
		{destination}
		bind:selectedContact={$selectedContact}
	/>
</WizardModal>
