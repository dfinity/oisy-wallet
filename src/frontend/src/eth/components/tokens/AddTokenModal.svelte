<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import { i18n } from '$lib/stores/i18n.store';
	import { authStore } from '$lib/stores/auth.store';
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import { saveErc20Contract } from '$eth/services/erc20.services';

	const steps: WizardSteps = [
		{
			name: 'Add',
			title: $i18n.tokens.import.text.title
		},
		{
			name: 'Review',
			title: $i18n.tokens.import.text.review
		},
		{
			name: 'Saving',
			title: $i18n.tokens.import.text.saving
		}
	];

	let saveProgressStep: ProgressStepsAddToken = ProgressStepsAddToken.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let contractAddress = '';
	let metadata: Erc20Metadata | undefined;

	const updateSaveProgressStep = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const save = async () => {
		await saveErc20Contract({
			contractAddress,
			metadata,
			chainId: $selectedChainId,
			network: $selectedEthereumNetwork,
			updateSaveProgressStep,
			modalNext: modal.next,
			onSuccess: close,
			onError: modal.back,
			identity: $authStore.identity,
		});
	};

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
	};
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Saving'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<AddTokenReview on:icBack={modal.back} on:icSave={save} {contractAddress} bind:metadata />
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{:else}
		<AddTokenForm
			on:icNext={modal.next}
			on:icClose={close}
			bind:contractAddress
			isFirstWizardStep={true}
		/>
	{/if}
</WizardModal>
