import { SEND_WIZARD_STEPS } from '$eth/constants/send.constants';
import type { WizardSteps } from '@dfinity/gix-components';

export const HOW_TO_CONVERT_WIZARD_STEPS: WizardSteps = [
	{
		name: 'Info',
		title: 'How to convert ETH to ckETH'
	},
	{
		name: 'ETH QR code',
		title: 'Receive address'
	},
	...SEND_WIZARD_STEPS
];
