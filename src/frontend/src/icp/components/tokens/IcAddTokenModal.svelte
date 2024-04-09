<script lang="ts">
	import AddTokenModal from '$lib/components/tokens/AddTokenModal.svelte';
	import { AddTokenStep } from '$lib/enums/steps';
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;
</script>

<AddTokenModal bind:saveProgressStep bind:currentStep bind:modal>
	<p>TODO: To be implemented</p>
</AddTokenModal>
