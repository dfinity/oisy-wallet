import type { WizardStepsConvert, WizardStepsSend } from '$lib/enums/wizard-steps';
import { type WizardModal, type WizardSteps } from '@dfinity/gix-components';

export const goToWizardSendStep = ({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal;
	steps: WizardSteps;
	stepName: WizardStepsSend | WizardStepsConvert;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
