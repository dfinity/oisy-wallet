import {
	howToConvertWizardSteps,
	type WizardStepsHowToConvertComplete
} from '$icp-eth/config/how-to-convert.config';
import type { ConvertWizardStepsParams } from '$lib/config/convert.config';
import { WizardStepsReceive } from '$lib/enums/wizard-steps';
import type { WizardSteps } from '@dfinity/gix-components';

export type WizardStepsReceiveComplete = WizardStepsReceive | WizardStepsHowToConvertComplete;

export const receiveWizardSteps = ({
	i18n,
	sourceToken,
	destinationToken
}: ConvertWizardStepsParams): WizardSteps<WizardStepsReceiveComplete> => [
	{
		name: WizardStepsReceive.RECEIVE,
		title: i18n.receive.text.receive
	},
	{
		name: WizardStepsReceive.QR_CODE,
		title: i18n.receive.text.address
	},
	...howToConvertWizardSteps({ i18n, sourceToken, destinationToken })
];
