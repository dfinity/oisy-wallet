import type { AddressBookSteps } from '$lib/enums/progress-steps';
import type {
	TokenModalSteps,
	WizardStepsAuthHelp,
	WizardStepsConvert,
	WizardStepsHowToConvert,
	WizardStepsLimitOrder,
	WizardStepsLiquidiumBorrow,
	WizardStepsLiquidiumSupply,
	WizardStepsReceive,
	WizardStepsScanner,
	WizardStepsSend,
	WizardStepsSwap,
	WizardStepsTradingDeposit,
	WizardStepsTradingWithdraw
} from '$lib/enums/wizard-steps';
import type { WizardStepsGetTokenType } from '$lib/types/get-token';
import type { WizardModal, WizardSteps } from '$lib/types/wizard';

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
	| WizardStepsScanner
	| WizardStepsTradingDeposit
	| WizardStepsTradingWithdraw
	| WizardStepsLimitOrder
	| WizardStepsLiquidiumSupply
	| WizardStepsLiquidiumBorrow;

export const goToWizardStep = <T extends StepName>({
	modal,
	steps,
	stepName
}: {
	modal: WizardModal<T>;
	steps: WizardSteps<T>;
	stepName: T;
}) => {
	const stepNumber = steps.findIndex(({ name }) => name === stepName);
	modal.set(Math.max(stepNumber, 0));
};
