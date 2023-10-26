<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';

	import { AddTokenStep } from '$lib/enums/steps';
	import AddTokenForm from '$lib/components/tokens/AddTokenForm.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import AddTokenReview from '$lib/components/tokens/AddTokenReview.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { ADD_TOKEN_STEPS, SEND_STEPS } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {isNullish} from "@dfinity/utils";
	import {authStore} from "$lib/stores/auth.store";
	import {addUserToken} from "$lib/api/backend.api";
	import {ETH_CHAIN_ID} from "$lib/constants/eth.constants";

	const steps: WizardSteps = [
		{
			name: 'Add',
			title: 'Add token'
		},
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Saving',
			title: 'Saving...'
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

	const save = () => {
		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: `Contract address is invalid.` }
			});
			return;
		}

		if (isNullish($authStore.identity)) {
			toastsError({
				msg: { text: `You are not authenticated.` }
			});
			return;
		}

		modal.next();

		try {
			await addUserToken({
				identity,
				token: {
					chain_id: ETH_CHAIN_ID,
					contract_address: contractAddress,
					symbol: [],
					decimals: []
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while saving the token.` },
				err
			});

			modal.back();
		}
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<AddTokenReview on:icBack={modal.back} on:icSave={save} {contractAddress} />
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={ADD_TOKEN_STEPS} />
	{:else}
		<AddTokenForm on:icNext={modal.next} on:icClose={close} bind:contractAddress />
	{/if}
</WizardModal>
