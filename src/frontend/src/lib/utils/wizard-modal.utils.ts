import type { AddressBookSteps } from '$lib/enums/progress-steps';
import type {
	WizardStepsAuthHelp,
	WizardStepsConvert,
	WizardStepsHowToConvert,
	WizardStepsReceive,
	WizardStepsSend
} from '$lib/enums/wizard-steps';
import type { WizardModal, WizardSteps } from '@dfinity/gix-components';

type StepName =
	| WizardStepsSend
	| WizardStepsConvert
	| WizardStepsAuthHelp
	| WizardStepsHowToConvert
	| WizardStepsReceive
	| AddressBookSteps;

export const goToWizardStep = <T extends StepName>({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal;
	steps: WizardSteps<T>;
	stepName: StepName;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
