import { scannerWizardSteps } from '$lib/config/scanner.config';
import { WizardStepsScanner } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';
import type { WizardSteps } from '@dfinity/gix-components';

describe('scanner.config', () => {
	describe('scannerWizardSteps', () => {
		const expectedBaseConfig: WizardSteps<WizardStepsScanner> = [
			{
				name: WizardStepsScanner.SCAN,
				title: en.scanner.text.scan_qr_code
			},
			{
				name: WizardStepsScanner.PAY,
				title: en.scanner.text.pay
			},
			{
				name: WizardStepsScanner.TOKENS_LIST,
				title: en.scanner.text.select_token_to_pay
			},
			{
				name: WizardStepsScanner.PAYING,
				title: en.scanner.text.pay
			},
			{
				name: WizardStepsScanner.PAYMENT_CONFIRMED,
				title: en.scanner.text.payment_confirmed
			},
			{
				name: WizardStepsScanner.PAYMENT_FAILED,
				title: en.scanner.text.payment_failed
			},
			{
				name: WizardStepsScanner.WALLET_CONNECT_CONNECT,
				title: en.wallet_connect.text.name
			},
			{
				name: WizardStepsScanner.WALLET_CONNECT_REVIEW,
				title: en.wallet_connect.text.session_proposal
			}
		];

		it('should return the correct steps with expected text and state', () => {
			const steps = scannerWizardSteps({ i18n: en });

			expect(steps).toStrictEqual(expectedBaseConfig);
		});
	});
});
