import {
	allSendNftsWizardSteps,
	allSendWizardSteps,
	sendNftsWizardStepsWithQrCodeScan,
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

	const expectedNftBaseConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.DESTINATION,
			title: en.send.text.send
		},
		{
			name: WizardStepsSend.REVIEW,
			title: en.send.text.review
		}
	];

	const expectedNftSendConfig: WizardSteps<WizardStepsSend> = [
		...expectedNftBaseConfig,
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

	const expectedMintConfig: WizardSteps<WizardStepsSend> = [
		expectedBaseConfig[0],
		{
			name: WizardStepsSend.SEND,
			title: en.mint.text.mint
		},
		expectedBaseConfig[2],
		{
			name: WizardStepsSend.SENDING,
			title: en.mint.text.minting
		}
	];

	const expectedQrCodeConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.QR_CODE_SCAN,
			title: en.send.text.scan_qr
		}
	];

	const expectedFilterNetworksConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.FILTER_NETWORKS,
			title: en.send.text.select_network_filter
		}
	];

	const expectedAllSendConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.TOKENS_LIST,
			title: en.send.text.select_token
		},
		...expectedFilterNetworksConfig
	];

	const expectedNftAllSendConfig: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.NFTS_LIST,
			title: en.send.text.select_nft
		},
		...expectedFilterNetworksConfig
	];

	const mockParams = {
		i18n: en
	};

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

		it('should return the correct steps with expected text and state when minting is false', () => {
			const steps = sendWizardStepsWithQrCodeScan({ ...mockParams, minting: false });

			expect(steps).toStrictEqual([...expectedSendConfig, ...expectedQrCodeConfig]);
		});

		it('should return the correct steps with expected text and state when minting is true', () => {
			const steps = sendWizardStepsWithQrCodeScan({ ...mockParams, minting: true });

			expect(steps).toStrictEqual([...expectedMintConfig, ...expectedQrCodeConfig]);
		});

		it('should prioritize minting over converting when both are true', () => {
			const steps = sendWizardStepsWithQrCodeScan({
				...mockParams,
				converting: true,
				minting: true
			});

			expect(steps).toStrictEqual([...expectedMintConfig, ...expectedQrCodeConfig]);
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

		it('should return the correct steps with expected text and state when minting is false', () => {
			const steps = allSendWizardSteps({ ...mockParams, minting: false });

			expect(steps).toStrictEqual([
				...expectedAllSendConfig,
				...expectedSendConfig,
				...expectedQrCodeConfig
			]);
		});

		it('should return the correct steps with expected text and state when minting is true', () => {
			const steps = allSendWizardSteps({ ...mockParams, minting: true });

			expect(steps).toStrictEqual([
				...expectedAllSendConfig,
				...expectedMintConfig,
				...expectedQrCodeConfig
			]);
		});

		it('should prioritize minting over converting when both are true', () => {
			const steps = allSendWizardSteps({ ...mockParams, converting: true, minting: true });

			expect(steps).toStrictEqual([
				...expectedAllSendConfig,
				...expectedMintConfig,
				...expectedQrCodeConfig
			]);
		});
	});

	describe('sendNftsWizardStepsWithQrCodeScan', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = sendNftsWizardStepsWithQrCodeScan(mockParams);

			expect(steps).toStrictEqual([...expectedNftSendConfig, ...expectedQrCodeConfig]);
		});
	});

	describe('allSendNftsWizardSteps', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = allSendNftsWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				...expectedNftAllSendConfig,
				...expectedNftSendConfig,
				...expectedQrCodeConfig
			]);
		});
	});
});
