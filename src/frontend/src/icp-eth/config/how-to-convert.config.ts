import { sendWizardSteps } from '$eth/config/send.config';
import type { WizardSteps } from '@dfinity/gix-components';

export const howToConvertWizardSteps = (i18n: I18n): WizardSteps => {
	const [send, ...rest] = sendWizardSteps(i18n);

	return [
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
};
