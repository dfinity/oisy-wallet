import { convertWizardSteps } from '$lib/config/convert.config';
import { WizardStepsConvert, WizardStepsSend } from '$lib/enums/wizard-steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';

describe('convert.config', () => {
	describe('convertWizardSteps', () => {
		const mockParams = {
			i18n: en,
			sourceToken: 'ETH',
			destinationToken: 'ckETH'
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = convertWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsConvert.CONVERT,
					title: replacePlaceholders(en.convert.text.swap_to_token, {
						$sourceToken: mockParams.sourceToken,
						$destinationToken: mockParams.destinationToken
					})
				},
				{
					name: WizardStepsConvert.REVIEW,
					title: en.convert.text.review
				},
				{
					name: WizardStepsConvert.CONVERTING,
					title: en.convert.text.executing_transaction
				},
				{
					name: WizardStepsConvert.DESTINATION,
					title: en.convert.text.conversion_destination
				},
				{
					name: WizardStepsSend.QR_CODE_SCAN,
					title: en.send.text.scan_qr
				}
			]);
		});
	});
});
