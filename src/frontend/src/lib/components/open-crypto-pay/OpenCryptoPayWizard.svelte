<script lang="ts">
	import type { WizardModal, WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import OpenCryptoPay from '$lib/components/open-crypto-pay/OpenCryptoPay.svelte';
	import OpenCryptoPayProgress from '$lib/components/open-crypto-pay/OpenCryptoPayProgress.svelte';
	import OpenCryptoPayTokensList from '$lib/components/open-crypto-pay/OpenCryptoPayTokensList.svelte';
	import PaymentFailed from '$lib/components/open-crypto-pay/PaymentFailed.svelte';
	import PaymentSucceeded from '$lib/components/open-crypto-pay/PaymentSucceeded.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import type { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { WizardStepsScanner } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { pay as payApi } from '$lib/services/open-crypto-pay.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { getOpenCryptoPayBaseTrackingParams } from '$lib/utils/open-crypto-pay.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		modal: WizardModal<WizardStepsScanner>;
		steps: WizardSteps<WizardStepsScanner>;
		currentStep?: WizardStep<WizardStepsScanner>;
		payProgressStep: ProgressStepsPayment;
	}

	let { modal, steps, currentStep, payProgressStep = $bindable() }: Props = $props();

	const onClose = () => modalStore.close();

	const { data, selectedToken, failedPaymentError, reset } =
		getContext<PayContext>(PAY_CONTEXT_KEY);

	const goToStep = (stepName: WizardStepsScanner) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({
			modal,
			steps,
			stepName
		});
	};

	const progress = (step: ProgressStepsPayment) => (payProgressStep = step);

	const pay = async () => {
		if (isNullish($selectedToken) || isNullish($data) || isNullish($authIdentity)) {
			return;
		}

		goToStep(WizardStepsScanner.PAYING);

		const trackEventBaseParams = getOpenCryptoPayBaseTrackingParams({
			token: $selectedToken,
			providerData: $data
		});

		const startTime = performance.now();

		const amount = parseToken({
			value: `${$selectedToken.amount}`,
			unitName: $selectedToken.decimals
		});

		try {
			await payApi({
				token: $selectedToken,
				data: $data,
				identity: $authIdentity,
				progress,
				amount
			});

			const duration = performance.now() - startTime;
			const durationInSeconds = Math.round(duration / 1000);

			trackEvent({
				name: PLAUSIBLE_EVENTS.PAY,
				metadata: {
					...trackEventBaseParams,
					result_status: 'success',
					result_duration_in_seconds: `${durationInSeconds}`
				}
			});

			goToStep(WizardStepsScanner.PAYMENT_CONFIRMED);
		} catch (error: unknown) {
			const duration = performance.now() - startTime;
			const durationInSeconds = Math.round(duration / 1000);
			const errorMessage = errorDetailToString(error) ?? $i18n.send.error.unexpected;

			trackEvent({
				name: PLAUSIBLE_EVENTS.PAY,
				metadata: {
					...trackEventBaseParams,
					result_status: 'error',
					result_error: errorMessage,
					result_duration_in_seconds: `${durationInSeconds}`
				}
			});

			failedPaymentError.set(errorMessage);

			goToStep(WizardStepsScanner.PAYMENT_FAILED);
		}
	};

	let isTokenSelecting = $state<boolean>(false);
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsScanner.PAY}
		<OpenCryptoPay
			onPayClick={pay}
			onSelectToken={() => goToStep(WizardStepsScanner.TOKENS_LIST)}
			bind:isTokenSelecting
		/>
	{:else if currentStep?.name === WizardStepsScanner.TOKENS_LIST && !isTokenSelecting}
		<OpenCryptoPayTokensList onClose={() => goToStep(WizardStepsScanner.PAY)} />
	{:else if currentStep?.name === WizardStepsScanner.PAYING}
		<OpenCryptoPayProgress {payProgressStep} />
	{:else if currentStep?.name === WizardStepsScanner.PAYMENT_FAILED}
		<PaymentFailed
			onClose={() => {
				reset();
				goToStep(WizardStepsScanner.SCAN);
			}}
		/>
	{:else if currentStep?.name === WizardStepsScanner.PAYMENT_CONFIRMED}
		<PaymentSucceeded {onClose} />
	{/if}
{/key}
