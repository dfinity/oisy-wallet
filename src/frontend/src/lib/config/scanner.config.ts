import { WizardStepsScanner } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const scannerWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsScanner> => [
	{
		name: WizardStepsScanner.SCAN,

		title: i18n.scanner.text.scan
	},
	{
		name: WizardStepsScanner.PAY,
		title: i18n.scanner.text.pay
	}
];
