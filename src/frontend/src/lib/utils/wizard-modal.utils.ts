import type { AddressBookSteps } from '$lib/enums/progress-steps';
import type {
	TokenModalSteps,
	WizardStepsAuthHelp,
	WizardStepsConvert,
	WizardStepsHowToConvert,
	WizardStepsReceive,
	WizardStepsScanner,
	WizardStepsSend,
	WizardStepsSwap
} from '$lib/enums/wizard-steps';
import type { WizardStepsGetTokenType } from '$lib/types/get-token';
import type { WizardModal, WizardSteps } from '@dfinity/gix-components';

type StepName =
	| WizardStepsSend
	| WizardStepsSwap
	| WizardStepsConvert
	| WizardStepsAuthHelp
	| WizardStepsHowToConvert
	| WizardStepsReceive
	| AddressBookSteps
	| TokenModalSteps
	| WizardStepsGetTokenType
	| WizardStepsScanner;

export const goToWizardStep = ({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal<StepName>;
	steps: WizardSteps<StepName>;
	stepName: StepName;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
