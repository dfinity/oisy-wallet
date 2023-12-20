<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import type { WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { SendIcpStep } from '$lib/enums/steps';
	import { SEND_ICP_STEPS } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import IcpSendForm from '$lib/components/send/icp/IcpSendForm.svelte';
	import IcpSendReview from '$lib/components/send/icp/IcpSendReview.svelte';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isNullish } from '@dfinity/utils';
	import { sendIcp } from '$lib/services/icp-send.services';
	import { parseToken } from '$lib/utils/parse.utils';
	import { tokenDecimals } from '$lib/derived/token.derived';

	/**
	 * Props
	 */

	let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = SendIcpStep.INITIALIZATION;

	const send = async () => {
		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: `Destination address is invalid.` }
			});
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: `Amount is invalid.` }
			});
			return;
		}

		modal.next();

		try {
			sendProgressStep = SendIcpStep.SEND;

			await sendIcp({
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $tokenDecimals
				})
			});

			sendProgressStep = SendIcpStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while sending the transaction.` },
				err
			});

			modal.back();
		}
	};

	const steps: WizardSteps = [
		{
			name: 'Send',
			title: 'Send'
		},
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Sending',
			title: 'Sending...'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		destination = '';
		amount = undefined;

		sendProgressStep = SendIcpStep.INITIALIZATION;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<IcpSendReview on:icBack={modal.back} on:icSend={send} {destination} {amount} />
	{:else if currentStep?.name === 'Sending'}
		<InProgressWizard progressStep={sendProgressStep} steps={SEND_ICP_STEPS} />
	{:else}
		<IcpSendForm on:icNext={modal.next} on:icClose={close} bind:destination bind:amount />
	{/if}
</WizardModal>
