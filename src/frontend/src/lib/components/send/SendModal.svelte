<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { sendWizardStepsComplete } from '$lib/config/send.config';
	import { createEventDispatcher } from 'svelte';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';
	import type { Token } from '$lib/types/token';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { closeModal } from '$lib/utils/modal.utils';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import type { Network, NetworkId } from '$lib/types/network';
	import SendTokensList from '$lib/components/send/SendTokensList.svelte';
	import SendWizard from '$lib/components/send/SendWizard.svelte';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;

	let networkId: NetworkId | undefined = undefined;
	$: networkId = targetNetwork?.id;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	let steps: WizardSteps;
	$: steps = sendWizardStepsComplete($i18n);

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			targetNetwork = undefined;

			sendProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});

	const isDisabled = (): boolean => $addressNotLoaded;

	const nextStep = async ({ detail: token }: CustomEvent<Token>) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		const callback = async () => {
			modal.next();
		};
		await loadTokenAndRun({ token, callback });
	};
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSend.SENDING}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === WizardStepsSend.TOKENS_LIST}
		<SendTokensList on:icSendToken={nextStep} />
	{:else}
		<SendWizard
			{currentStep}
			bind:destination
			bind:networkId
			bind:targetNetwork
			bind:amount
			bind:sendProgressStep
			on:icBack={modal.back}
			on:icSendBack={modal.back}
			on:icNext={modal.next}
			on:icClose={close}
			on:icQRCodeScan={() =>
				goToWizardSendStep({
					modal,
					steps,
					stepName: WizardStepsSend.QR_CODE_SCAN
				})}
			on:icQRCodeBack={() =>
				goToWizardSendStep({
					modal,
					steps,
					stepName: WizardStepsSend.SEND
				})}
		/>
	{/if}
</WizardModal>
