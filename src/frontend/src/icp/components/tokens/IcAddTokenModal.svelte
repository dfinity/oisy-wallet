<script lang="ts">
	import AddTokenModal from '$lib/components/tokens/AddTokenModal.svelte';
	import { AddTokenStep } from '$lib/enums/steps';
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
	};
</script>

<AddTokenModal bind:saveProgressStep bind:currentStep bind:modal on:icClose={close}>
	<p>TODO: To be implemented</p>
</AddTokenModal>
