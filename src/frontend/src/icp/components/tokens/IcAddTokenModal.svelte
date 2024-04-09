<script lang="ts">
	import AddTokenModal from '$lib/components/tokens/AddTokenModal.svelte';
	import { AddTokenStep } from '$lib/enums/steps';
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import type { IcCanisters } from '$icp/types/ic';

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let canisters: Partial<IcCanisters> | undefined;
</script>

<AddTokenModal bind:saveProgressStep bind:currentStep bind:modal>
	<IcAddTokenForm on:icNext={modal.next} on:icClose={close} bind:canisters />
</AddTokenModal>
