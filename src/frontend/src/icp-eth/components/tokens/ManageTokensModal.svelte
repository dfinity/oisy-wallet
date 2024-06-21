<script lang="ts">
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import ManageTokens from '$icp-eth/components/tokens/ManageTokens.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { saveIcrcCustomToken } from '$icp/services/ic-custom-tokens.services';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';

	const steps: WizardSteps = [
		{
			name: 'Manage',
			title: $i18n.tokens.manage.text.title
		},
		{
			name: 'Import',
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

	let saveProgressStep: string = ProgressStepsAddToken.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const saveTokens = async ({ detail: tokens }: CustomEvent<IcrcCustomToken[]>) => {
		await save(tokens);
	};

	const addToken = async () => {
		await save([
			{
				enabled: true,
				ledgerCanisterId,
				indexCanisterId
			}
		]);
	};

	const progress = (step: ProgressStepsAddToken) => (saveProgressStep = step);

	const save = async (
		tokens: Pick<IcrcCustomToken, 'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'>[]
	) => {
		await saveIcrcCustomToken({
			tokens,
			progress,
			modalNext: () => modal.set(3),
			onSuccess: close,
			onError: () => modal.set(0),
			identity: $authStore.identity
		});
	};

	const close = () => {
		modalStore.close();

		saveProgressStep = ProgressStepsAddToken.INITIALIZATION;
	};

	let ledgerCanisterId = '';
	let indexCanisterId = '';
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
		<IcAddTokenReview
			on:icBack={modal.back}
			on:icSave={addToken}
			{ledgerCanisterId}
			{indexCanisterId}
		/>
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{:else if currentStep?.name === 'Import'}
		<IcAddTokenForm
			on:icBack={modal.back}
			on:icNext={modal.next}
			bind:ledgerCanisterId
			bind:indexCanisterId
		/>
	{:else}
		<ManageTokens on:icClose={close} on:icAddToken={modal.next} on:icSave={saveTokens} />
	{/if}
</WizardModal>
