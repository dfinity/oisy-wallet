import type { AddressBookSteps } from '$lib/enums/progress-steps';
import type {
	TokenModalSteps,
	WizardStepsAuthHelp,
	WizardStepsConvert,
	WizardStepsHowToConvert,
	WizardStepsReceive,
	WizardStepsSend
} from '$lib/enums/wizard-steps';
import type { WizardModal, WizardSteps } from '@dfinity/gix-components';

type WizardStepsName =
	| WizardStepsSend
	| WizardStepsConvert
	| WizardStepsAuthHelp
	| WizardStepsHowToConvert
	| WizardStepsReceive
	| AddressBookSteps
	| TokenModalSteps;

export const goToWizardStep = ({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal<WizardStepsName>;
	steps: WizardSteps<WizardStepsName>;
	stepName: WizardStepsName;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
