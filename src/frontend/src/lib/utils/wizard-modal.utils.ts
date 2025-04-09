import {
	type WizardStepsAuthHelp,
	type WizardStepsConvert,
	type WizardStepsSend
} from '$lib/enums/wizard-steps';
import { type WizardModal, type WizardSteps } from '@dfinity/gix-components';

export const goToWizardStep = ({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal;
	steps: WizardSteps;
	stepName: WizardStepsSend | WizardStepsConvert | WizardStepsAuthHelp;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
