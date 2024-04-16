<script lang="ts">
	import { AddTokenStep } from '$lib/enums/steps';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import IcManageTokens from '$icp/components/tokens/IcManageTokens.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import IcAddTokenReview from '$icp/components/tokens/IcAddTokenReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { IcrcCustomTokenConfig } from '$icp/types/icrc-custom-token';
	import { saveCustomTokens } from '$icp/services/ic-custom-tokens.services';

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

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const saveTokens = async ({ detail: tokens }: CustomEvent<IcrcCustomTokenConfig[]>) => {
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

	const save = async (
		tokens: Pick<IcrcCustomTokenConfig, 'enabled' | 'ledgerCanisterId' | 'indexCanisterId'>[]
	) => {
		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		if (tokens.length === 0) {
			toastsError({
				msg: { text: $i18n.tokens.manage.error.empty }
			});
			return;
		}

		modal.set(3);

		try {
			await saveCustomTokens({
				identity: $authStore.identity,
				tokens,
				progress: (step: AddTokenStep) => (saveProgressStep = step)
			});

			saveProgressStep = AddTokenStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected },
				err
			});

			modal.set(0);
		}
	};

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
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
		<IcManageTokens on:icClose={close} on:icAddToken={modal.next} on:icSave={saveTokens} />
	{/if}
</WizardModal>
