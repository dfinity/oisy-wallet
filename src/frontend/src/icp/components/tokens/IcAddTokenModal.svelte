<script lang="ts">
	import AddTokenModal from '$lib/components/tokens/AddTokenModal.svelte';
	import { AddTokenStep } from '$lib/enums/steps';
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { KnownIcrcToken } from '$lib/types/known-token';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
	};

	let token: KnownIcrcToken | undefined;

	const selectKnownToken = ({ detail }: CustomEvent<KnownIcrcToken>) => {
		token = detail;

		modal.next();
	};

	const save = async () => {};
</script>

<AddTokenModal bind:saveProgressStep bind:currentStep bind:modal on:icClose={close}>
	{#if currentStep?.name === 'Review'}
		<IcAddTokenReview on:icBack={modal.back} on:icSave={save} {token} />
	{:else}
		<IcAddTokenForm on:icNext={modal.next} on:icClose={close} on:icToken={selectKnownToken} />
	{/if}
</AddTokenModal>
