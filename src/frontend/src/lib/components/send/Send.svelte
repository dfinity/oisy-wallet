<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { send as executeSend } from '$lib/services/send.services';
	import { isNullish } from '@dfinity/utils';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { type WizardStep, type WizardSteps, WizardModal } from '@dfinity/gix-components';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendProgress from '$lib/components/send/SendProgress.svelte';
	import { SendStep } from '$lib/enums/send';
	import { getContext } from 'svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { balanceEmpty } from '$lib/derived/balances.derived';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { modalSend } from '$lib/derived/modal.derived';
	import { addressStore } from '$lib/stores/address.store';
	import { token } from '$lib/derived/token.derived';
	import { FEE_CONTEXT_KEY, type FeeContext as FeeContextType } from '$lib/stores/fee.store';
	import FeeContext from '$lib/components/fee/FeeContext.svelte';

	let destination = '';
	let amount: number | undefined = undefined;

	const { obverseFee, store: storeFeeData }: FeeContextType =
		getContext<FeeContextType>(FEE_CONTEXT_KEY);

	$: obverseFee($modalSend);

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
				amount: amount!,
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas
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

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $balanceEmpty || sendProgressStep !== SendStep.INITIALIZATION;

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

<button
	class="flex-1 secondary"
	on:click={modalStore.openSend}
	{disabled}
	class:opacity-50={disabled}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalSend}
	<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
		<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

		<FeeContext {amount} {destination}>
			{#if currentStep?.name === 'Review'}
				<SendReview on:icBack={modal.back} on:icSend={send} bind:destination bind:amount />
			{:else if currentStep?.name === 'Sending'}
				<SendProgress progressStep={sendProgressStep} />
			{:else}
				<SendForm on:icNext={modal.next} on:icClose={close} bind:destination bind:amount />
			{/if}
		</FeeContext>
	</WizardModal>
{/if}
