<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import AddTokenReview from '$eth/components/tokens/AddTokenReview.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { AddTokenStep } from '$lib/enums/steps';
	import { addUserToken } from '$lib/api/backend.api';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import { mapErc20Token } from '$eth/utils/erc20.utils';
	import { modalStore } from '$lib/stores/modal.store';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';

	import { addTokenSteps } from '$lib/constants/steps.constants';

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

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let contractAddress = '';
	let metadata: Erc20Metadata | undefined;

	const save = async () => {
		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.tokens.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish(metadata)) {
			toastsError({
				msg: { text: $i18n.tokens.error.no_metadata }
			});
			return;
		}

		if (isNullish($authStore.identity)) {
			await nullishSignOut();
			return;
		}

		modal.next();

		try {
			saveProgressStep = AddTokenStep.SAVE;

			await addUserToken({
				identity: $authStore.identity,
				token: {
					chain_id: $selectedChainId,
					contract_address: contractAddress,
					symbol: [],
					decimals: [],
					timestamp: []
				}
			});

			saveProgressStep = AddTokenStep.UPDATE_UI;

			erc20TokensStore.add(
				mapErc20Token({
					address: contractAddress,
					exchange: 'ethereum',
					category: 'custom',
					network: $selectedEthereumNetwork,
					...metadata
				})
			);

			saveProgressStep = AddTokenStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected },
				err
			});

			modal.back();
		}
	};

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
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
		<AddTokenForm on:icNext={modal.next} on:icClose={close} bind:contractAddress />
	{/if}
</WizardModal>
