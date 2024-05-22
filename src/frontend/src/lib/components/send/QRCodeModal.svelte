<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import {
		QRCodeReaderModal,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import { type Token } from '@dfinity/utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';

	export let steps: WizardSteps;
	export let currentStep: WizardStep | undefined = undefined;

	const STEP_QRCODE = 'QRCode';

	let stepsPlusQr: WizardSteps;
	$: stepsPlusQr = [
		...steps,
		{
			name: STEP_QRCODE,
			title: $i18n.send.text.scan_qr
		}
	];

	let modal: WizardModal;

	const goToStep = (stepName: string) => {
		const stepNumber = stepsPlusQr.findIndex(({ name }) => name === stepName);
		modal.set(stepNumber);
	};

	let resolveQrCodePromise:
		| (({ status, code }: { status: QrStatus; code?: string }) => void)
		| undefined = undefined;

	export const scanQrCode = async ({
		expectedToken
	}: {
		expectedToken: Token;
	}): Promise<QrResponse> => {
		const prevStep = currentStep;
		goToStep(STEP_QRCODE);

		return new Promise<{ status: QrStatus; code?: string | undefined }>((resolve) => {
			resolveQrCodePromise = resolve;
		})
			.then(({ status, code }) => {
				if (status === 'token_incompatible') {
					toastsError({
						msg: { text: $i18n.send.error.incompatible_token }
					});
					return Promise.reject(new Error('Token incompatible'));
				}
				return decodeQrCode({ status, code, expectedToken });
			})
			.finally(() => goToStep(prevStep?.name || steps[0].name));
	};

	const onQRCode = ({ detail: code }: CustomEvent<string>) => {
		resolveQrCodePromise?.({ status: 'success', code });
		resolveQrCodePromise = undefined;
	};

	const onCancel = () => {
		resolveQrCodePromise?.({ status: 'cancelled' });
		resolveQrCodePromise = undefined;
	};
</script>

<WizardModal
	steps={stepsPlusQr}
	bind:currentStep
	bind:this={modal}
	on:nnsClose
	testId="qr-code-modal"
	disablePointerEvents={currentStep?.name === 'Sending'}
>
	<svelte:fragment slot="title">{$i18n.send.text.scan_qr}</svelte:fragment>
	{#if currentStep?.name === STEP_QRCODE}
		<QRCodeReaderModal on:nnsCancel={onCancel} on:nnsQRCode={onQRCode} />
	{/if}
</WizardModal>
