import { WizardStepsSend } from '$lib/enums/wizard-steps';
import { WizardModal, type WizardSteps } from '@dfinity/gix-components';

export const goToWizardStep = ({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal;
	steps: WizardSteps;
	stepName: WizardStepsSend;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
