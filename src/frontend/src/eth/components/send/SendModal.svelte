<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { send as executeSend } from '$eth/services/send.services';
	import { isNullish } from '@dfinity/utils';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendForm from './SendForm.svelte';
	import SendReview from './SendReview.svelte';
	import { mapAddressStartsWith0x } from '$eth/utils/send.utils';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { modalStore } from '$lib/stores/modal.store';
	import { address } from '$lib/derived/address.derived';
	import { token, tokenDecimals, tokenId, tokenStandard } from '$lib/derived/token.derived';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { setContext } from 'svelte';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import { SEND_STEPS } from '$lib/constants/steps.constants';
	import { parseToken } from '$lib/utils/parse.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import type { Network } from '$lib/types/network';
	import { authStore } from '$lib/stores/auth.store';
	import { ckEthHelperContractAddressStore } from '$eth/stores/cketh.store';
	import { assertCkEthHelperContractAddressLoaded } from '$eth/services/cketh.services';

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

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let purpose: 'send' | 'convert-eth-to-cketh' = 'send';

	let destinationEditable = true;
	$: destinationEditable = purpose !== 'convert-eth-to-cketh';

	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = SendStep.INITIALIZATION;

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

		if (isNullish($storeFeeData)) {
			toastsError({
				msg: { text: `Gas fees are not defined.` }
			});
			return;
		}

		const { valid } = assertCkEthHelperContractAddressLoaded({
			tokenStandard: $tokenStandard,
			helperContractAddress: $ckEthHelperContractAddressStore?.[$tokenId],
			network
		});

		if (!valid) {
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

		// Unexpected errors
		if (isNullish($address)) {
			toastsError({
				msg: { text: 'Address is unknown.' }
			});
			return;
		}

		modal.next();

		try {
			await executeSend({
				from: $address,
				to: mapAddressStartsWith0x(destination),
				progress: (step: SendStep) => (sendProgressStep = step),
				token: $token,
				amount: parseToken({
					value: `${amount}`,
					unitName: $tokenDecimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				network,
				identity: $authStore.identity,
				ckEthHelperContractAddress: $ckEthHelperContractAddressStore?.[$tokenId]
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

	let steps: WizardSteps;
	$: steps = [
		{
			name: 'Send',
			title: purpose === 'convert-eth-to-cketh' ? 'Convert ETH to ckETH' : 'Send'
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
		network = undefined;

		sendProgressStep = SendStep.INITIALIZATION;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<FeeContext {amount} {destination} observe={currentStep?.name !== 'Sending'} {network}>
		{#if currentStep?.name === 'Review'}
			<SendReview
				on:icBack={modal.back}
				on:icSend={send}
				{destination}
				{amount}
				{network}
				{destinationEditable}
			/>
		{:else if currentStep?.name === 'Sending'}
			<InProgressWizard progressStep={sendProgressStep} steps={SEND_STEPS} />
		{:else}
			<SendForm
				on:icNext={modal.next}
				on:icClose={close}
				bind:destination
				bind:amount
				bind:network
				{destinationEditable}
			/>
		{/if}
	</FeeContext>
</WizardModal>
