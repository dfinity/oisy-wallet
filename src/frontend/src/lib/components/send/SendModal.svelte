<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { send as executeSend } from '$lib/services/send.services';
	import { isNullish } from '@dfinity/utils';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { modalStore } from '$lib/stores/modal.store';
	import { addressStore } from '$lib/stores/address.store';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '$lib/stores/fee.store';
	import { setContext } from 'svelte';
	import FeeContext from '$lib/components/fee/FeeContext.svelte';
	import { SEND_STEPS } from '$lib/constants/steps.constants';
	import { parseToken } from '$lib/utils/parse.utils';
	import type { TargetNetwork } from '$lib/enums/network';

	/**
	 * Fee context store
	 */

	let storeFeeData = initFeeStore();

	setContext<FeeContextType>(FEE_CONTEXT_KEY, {
		store: storeFeeData
	});

	/**
	 * Props
	 */

	let destination = '';
	let amount: number | undefined = undefined;
	let network: TargetNetwork | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = SendStep.INITIALIZATION;

	const send = async () => {
		if (invalidDestination(destination)) {
			toastsError({
				msg: { text: `Destination address is invalid.` }
			});
			return;
		}

		if (invalidAmount(amount)) {
			toastsError({
				msg: { text: `Amount is invalid.` }
			});
			return;
		}

		if (isNullish($storeFeeData)) {
			toastsError({
				msg: { text: `Gas fees are not defined.` }
			});
			return;
		}

		// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $storeFeeData;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
			});
			return;
		}

		modal.next();

		try {
			await executeSend({
				from: $addressStore!,
				to: destination!,
				progress: (step: SendStep) => (sendProgressStep = step),
				token: $token,
				amount: parseToken({
					value: `${amount!}`,
					unitName: $tokenDecimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				network
			});

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

		sendProgressStep = SendStep.INITIALIZATION;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<FeeContext {amount} {destination} observe={currentStep?.name !== 'Sending'} {network}>
		{#if currentStep?.name === 'Review'}
			<SendReview on:icBack={modal.back} on:icSend={send} {destination} {amount} {network} />
		{:else if currentStep?.name === 'Sending'}
			<SendProgress progressStep={sendProgressStep} steps={SEND_STEPS} />
		{:else}
			<SendForm
				on:icNext={modal.next}
				on:icClose={close}
				bind:destination
				bind:amount
				bind:network
			/>
		{/if}
	</FeeContext>
</WizardModal>
