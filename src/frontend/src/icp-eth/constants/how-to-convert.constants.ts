import { SEND_WIZARD_STEPS } from '$eth/constants/send.constants';
import type { WizardSteps } from '@dfinity/gix-components';

const [send, ...rest] = SEND_WIZARD_STEPS;

export const HOW_TO_CONVERT_WIZARD_STEPS: WizardSteps = [
	{
		name: 'Info',
		title: 'How to convert ETH to ckETH'
	},
	{
		name: 'ETH QR code',
		title: 'Receive address'
	},
	{
		...send,
		title: 'Convert ETH to ckETH'
	},
	...rest
];
