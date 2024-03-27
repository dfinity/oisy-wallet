import type { WizardSteps } from '@dfinity/gix-components';

export const SEND_WIZARD_STEPS = (i18n: I18n): WizardSteps => [
	{
		name: 'Send',
		title: i18n.send.text.send
	},
	{
		name: 'Review',
		title: i18n.send.text.review
	},
	{
		name: 'Sending',
		title: i18n.send.text.sending
	}
];
