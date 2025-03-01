import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { sendWizardSteps } from '$lib/config/send.config';
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
	const [send, ...rest] = sendWizardSteps({ i18n });

	const { id: tokenId, symbol } = twinToken;

	return [
		{
			name: 'Info',
			title: replacePlaceholders(i18n.info.ethereum.how_to_short, {
				$token: symbol
			})
		},
		{
			name: 'ETH QR code',
			title: i18n.receive.text.address
		},
		{
			...send,
			title: [SEPOLIA_TOKEN_ID, ETHEREUM_TOKEN_ID].includes(tokenId)
				? i18n.convert.text.convert_to_cketh
				: replacePlaceholders(i18n.convert.text.convert_to_ckerc20, {
						$ckErc20: symbol
					})
		},
		...rest
	];
};
