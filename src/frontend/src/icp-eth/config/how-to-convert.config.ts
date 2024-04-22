import { sendWizardSteps } from '$eth/config/send.config';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { WizardSteps } from '@dfinity/gix-components';

export const howToConvertWizardSteps = ({
	i18n,
	twinToken
}: {
	i18n: I18n;
	twinToken: Token;
}): WizardSteps => {
	const [send, ...rest] = sendWizardSteps(i18n);

	return [
		{
			name: 'Info',
			title: replacePlaceholders(i18n.info.ethereum.how_to_short, {
				$token: twinToken.symbol
			})
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
