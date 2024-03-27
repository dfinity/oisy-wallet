import { SEND_WIZARD_STEPS } from '$eth/constants/send.constants';
import type { WizardSteps } from '@dfinity/gix-components';

const [send, ...rest] = SEND_WIZARD_STEPS;

export const HOW_TO_CONVERT_WIZARD_STEPS = (i18n: I18n): WizardSteps => [
	{
		name: 'Info',
		title: i18n.info.ethereum.how_to
	},
	{
		name: 'ETH QR code',
		title: i18n.receive.text.address
	},
	{
		...send,
		title: i18n.convert.text.convert_to_cketh
	},
	...rest
];
