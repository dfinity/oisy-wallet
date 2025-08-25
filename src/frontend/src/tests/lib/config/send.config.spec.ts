import {
	allSendWizardSteps,
	sendWizardSteps,
	sendWizardStepsWithQrCodeScan
} from '$lib/config/send.config';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';
import type { WizardSteps } from '@dfinity/gix-components';

describe('send.config', () => {
	const expectedBaseConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.DESTINATION,
			title: en.send.text.send
		},
		{
			name: WizardStepsSend.SEND,
			title: en.send.text.send
		},
		{
			name: WizardStepsSend.REVIEW,
			title: en.send.text.review
		}
	];

	const expectedSendConfig: WizardSteps<WizardStepsSend> = [
		...expectedBaseConfig,
		{
			name: WizardStepsSend.SENDING,
			title: en.send.text.sending
		}
	];

	const expectedConvertConfig: WizardSteps<WizardStepsSend> = [
		...expectedBaseConfig,
		{
			name: WizardStepsSend.SENDING,
			title: en.convert.text.converting
		}
	];

	const expectedQrCodeConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.QR_CODE_SCAN,
			title: en.send.text.scan_qr
		}
	];

	const expectedAllSendConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.TOKENS_LIST,
			title: en.send.text.select_token
		},
		{
			name: WizardStepsSend.FILTER_NETWORKS,
			title: en.send.text.select_network_filter
		}
	];

	const mockParams = {
		i18n: en
	};

	describe('sendWizardSteps', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = sendWizardSteps(mockParams);

			expect(steps).toStrictEqual(expectedSendConfig);
		});

		it('should return the correct steps with expected text and state when converting is false', () => {
			const steps = sendWizardSteps({ ...mockParams, converting: false });

			expect(steps).toStrictEqual(expectedSendConfig);
		});

		it('should return the correct steps with expected text and state when converting is true', () => {
			const steps = sendWizardSteps({ ...mockParams, converting: true });

			expect(steps).toStrictEqual(expectedConvertConfig);
		});
	});

	describe('sendWizardStepsWithQrCodeScan', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = sendWizardStepsWithQrCodeScan(mockParams);

			expect(steps).toStrictEqual([...expectedSendConfig, ...expectedQrCodeConfig]);
		});

		it('should return the correct steps with expected text and state when converting is false', () => {
			const steps = sendWizardStepsWithQrCodeScan({ ...mockParams, converting: false });

			expect(steps).toStrictEqual([...expectedSendConfig, ...expectedQrCodeConfig]);
		});

		it('should return the correct steps with expected text and state when converting is true', () => {
			const steps = sendWizardStepsWithQrCodeScan({ ...mockParams, converting: true });

			expect(steps).toStrictEqual([...expectedConvertConfig, ...expectedQrCodeConfig]);
		});
	});

	describe('allSendWizardSteps', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = allSendWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				...expectedAllSendConfig,
				...expectedSendConfig,
				...expectedQrCodeConfig
			]);
		});

		it('should return the correct steps with expected text and state when converting is false', () => {
			const steps = allSendWizardSteps({ ...mockParams, converting: false });

			expect(steps).toStrictEqual([
				...expectedAllSendConfig,
				...expectedSendConfig,
				...expectedQrCodeConfig
			]);
		});

		it('should return the correct steps with expected text and state when converting is true', () => {
			const steps = allSendWizardSteps({ ...mockParams, converting: true });

			expect(steps).toStrictEqual([
				...expectedAllSendConfig,
				...expectedConvertConfig,
				...expectedQrCodeConfig
			]);
		});
	});
});
