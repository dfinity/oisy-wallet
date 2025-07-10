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

export const goToWizardStep = ({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal;
	steps: WizardSteps;
	stepName:
		| WizardStepsSend
		| WizardStepsConvert
		| WizardStepsAuthHelp
		| WizardStepsHowToConvert
		| WizardStepsReceive
		| AddressBookSteps
		| TokenModalSteps;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
