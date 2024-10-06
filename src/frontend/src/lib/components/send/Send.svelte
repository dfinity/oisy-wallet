<script lang="ts">
	import { type WizardStep, type WizardSteps, WizardStepsState } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import SendTokensList from '$lib/components/send/SendTokensList.svelte';
	import SendWizard from '$lib/components/send/SendWizard.svelte';
	import { allSendWizardSteps } from '$lib/config/send.config';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { OptionToken, Token } from '$lib/types/token';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;

	export const next = () => (stepState = stepState.next());
	export const back = () => (stepState = stepState.back());
	export const set = (step: number) => (stepState = stepState.set(step));

	let stepState: WizardStepsState;
	$: stepState = new WizardStepsState(steps);

	let networkId: NetworkId | undefined = undefined;
	$: networkId = targetNetwork?.id;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	let steps: WizardSteps;
	$: steps = allSendWizardSteps({ i18n: $i18n });

	let currentStep: WizardStep | undefined;
	$: ({ currentStep } = stepState);

	const close = () => {
		token = undefined;
		destination = '';
		amount = undefined;
		targetNetwork = undefined;

		sendProgressStep = ProgressStepsSend.INITIALIZATION;

		stepState = new WizardStepsState(steps);
	};

	const isDisabled = (): boolean => $ethAddressNotLoaded;

	let token: OptionToken;

	const nextStep = async ({ detail: selectedToken }: CustomEvent<Token>) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		token = selectedToken;

		const callback = async () => {
			next();
		};
		await loadTokenAndRun({ token: selectedToken, callback });
	};
</script>

{#if currentStep?.name === WizardStepsSend.TOKENS_LIST}
	<SendTokensList on:icSendToken={nextStep} />
{:else if nonNullish(token)}
	<SendWizard
		{token}
		{currentStep}
		bind:destination
		bind:networkId
		bind:targetNetwork
		bind:amount
		bind:sendProgressStep
		on:icBack={back}
		on:icSendBack={back}
		on:icNext={next}
		on:icClose={close}
		on:icQRCodeScan={() =>
			goToWizardSendStep({
				set,
				steps,
				stepName: WizardStepsSend.QR_CODE_SCAN
			})}
		on:icQRCodeBack={() =>
			goToWizardSendStep({
				set,
				steps,
				stepName: WizardStepsSend.SEND
			})}
	/>
{/if}
