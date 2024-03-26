<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { AddTokenStep } from '$lib/enums/steps';
	import AddTokenForm from '$lib/components/tokens/AddTokenForm.svelte';
	import AddTokenReview from '$lib/components/tokens/AddTokenReview.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { isNullish } from '@dfinity/utils';
	import { authStore } from '$lib/stores/auth.store';
	import { addUserToken } from '$lib/api/backend.api';
	import { erc20TokensStore } from '$eth/stores/erc20.store';
	import type { Erc20Metadata } from '$eth/types/erc20';
	import { mapErc20Token } from '$eth/utils/erc20.utils';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { ADD_TOKEN_STEPS } from '$lib/constants/steps.constants';
	import { selectedChainId, selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const steps: WizardSteps = [
		{
			name: 'Add',
			title: $i18n.token.text.add
		},
		{
			name: 'Review',
			title: $i18n.token.text.review
		},
		{
			name: 'Saving',
			title: $i18n.token.text.saving
		}
	];

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
	};

	let contractAddress = '';
	let metadata: Erc20Metadata | undefined;

	const save = async () => {
		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: $i18n.token.error.invalid_contract_address }
			});
			return;
		}

		if (isNullish(metadata)) {
			toastsError({
				msg: { text: $i18n.token.error.no_metadata }
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
					decimals: []
				}
			});

			saveProgressStep = AddTokenStep.UPDATE_UI;

			erc20TokensStore.add(
				mapErc20Token({
					address: contractAddress,
					exchange: 'ethereum',
					network: $selectedEthereumNetwork,
					...metadata
				})
			);

			saveProgressStep = AddTokenStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.token.error.unexpected },
				err
			});

			modal.back();
		}
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<AddTokenReview on:icBack={modal.back} on:icSave={save} {contractAddress} bind:metadata />
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={ADD_TOKEN_STEPS} />
	{:else}
		<AddTokenForm on:icNext={modal.next} on:icClose={close} bind:contractAddress />
	{/if}
</WizardModal>
