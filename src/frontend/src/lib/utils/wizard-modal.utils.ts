import { WizardStepsSend } from '$lib/enums/wizard-steps';
import { type WizardSteps } from '@dfinity/gix-components';

export const goToWizardSendStep = ({
	set,
	steps,
	stepName
}: {
	set: (step: number) => void;
	steps: WizardSteps;
	stepName: WizardStepsSend;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	set(Math.max(stepNumber, 0));
};
