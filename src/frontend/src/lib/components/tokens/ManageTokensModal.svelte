<script lang="ts">
	import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { toastsError } from '$lib/stores/toasts.store';
	import { saveCustomTokens } from '$icp/services/ic-custom-tokens.services';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import ManageTokens from '$lib/components/tokens/ManageTokens.svelte';

	const steps: WizardSteps = [
		{
			name: 'Manage',
			title: $i18n.tokens.manage.text.title
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

	const save = async (
		tokens: Pick<IcrcCustomToken, 'enabled' | 'version' | 'ledgerCanisterId' | 'indexCanisterId'>[]
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
				progress: (step: ProgressStepsAddToken) => (saveProgressStep = step)
			});

			saveProgressStep = ProgressStepsAddToken.DONE;

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

	{#if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{:else}
		<ManageTokens on:icClose={close} on:icAddToken={modal.next} on:icSave={saveTokens} />
	{/if}
</WizardModal>
