<script lang="ts">
	import { BURN_STEPS } from '$lib/constants/steps.constants';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import BurnForm from '$lib/components/burn/BurnForm.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { BurnStep, SendStep } from '$lib/enums/steps';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import { parseToken } from '$lib/utils/parse.utils';
	import { burnToICP } from '$lib/providers/infura-icp-erc20.providers';
	import { isErc20Icp } from '$lib/utils/token.utils';
	import BurnReview from '$lib/components/burn/BurnReview.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	/**
	 * Modal
	 */

	const steps: WizardSteps = [
		{
			name: 'Burn',
			title: 'Burn'
		},
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Burning',
			title: 'Burning...'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		destination = '';
		amount = undefined;

		burnProgressStep = BurnStep.INITIALIZATION;
	};

	/**
	 * Props
	 */

	let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Burn
	 */

	let burnProgressStep: string = SendStep.INITIALIZATION;

	const burn = async () => {
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

		if (!isErc20Icp($token)) {
			toastsError({
				msg: { text: `The token ${$token.symbol} cannot be burned.` }
			});
			return;
		}

		modal.next();

		try {
			burnProgressStep = BurnStep.BURN;

			await burnToICP({
				contract: $token,
				to: destination,
				amount: parseToken({
					value: `${amount!}`,
					unitName: $tokenDecimals
				})
			});

			burnProgressStep = BurnStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while burning to destination.` },
				err
			});

			modal.back();
		}
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<BurnReview on:icBack={modal.back} on:icSend={burn} bind:destination bind:amount />
	{:else if currentStep?.name === 'Burning'}
		<SendProgress progressStep={burnProgressStep} steps={BURN_STEPS} />
	{:else}
		<BurnForm on:icNext={modal.next} on:icClose={close} bind:destination bind:amount />
	{/if}
</WizardModal>
