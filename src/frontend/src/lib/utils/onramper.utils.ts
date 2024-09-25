import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/onramper.env';
import type {
	OnramperCryptoWallet,
	OnramperFiatId,
	OnramperId,
	OnramperMode,
	OnramperNetworkId
} from '$lib/types/onramper';
import { nonNullish } from '@dfinity/utils';

export interface BuildOnramperLinkParams {
	mode: OnramperMode;
	defaultFiat: OnramperFiatId;
	defaultCrypto?: OnramperId;
	onlyCryptos: OnramperId[];
	onlyCryptoNetworks: OnramperNetworkId[];
	wallets: OnramperCryptoWallet[];
	supportRecurringPayments: boolean;
	enableCountrySelector: boolean;
}

const arrayToParam = (array: OnramperId[] | OnramperNetworkId[]) => array.join(',');

const walletToParam = ({ cryptoId, wallet }: OnramperCryptoWallet) => `${cryptoId}:${wallet}`;

const walletsToParam = (wallets: OnramperCryptoWallet[]) =>
	arrayToParam(wallets.map(walletToParam));

const toQueryString = (params: Omit<BuildOnramperLinkParams, 'wallets'>) =>
	Object.entries(params)
		.reduce<string[]>(
			(acc, [key, value]) =>
				Array.isArray(value)
					? value.length > 0
						? [...acc, `${key}=${arrayToParam(value)}`]
						: acc
					: nonNullish(value)
						? [...acc, `${key}=${value}`]
						: acc,
			[]
		)
		.join('&');

/**
 * Build a source link for the Onramper widget, given a set of parameters.
 * The documentation for the Onramper widget's parameters can be found here:
 * https://docs.onramper.com/docs/supported-widget-parameters
 *
 * @param {Object} params - The parameters to build the link with.
 * @param {OnramperMode} params.mode - The mode of the widget (buy or sell).
 * @param {OnramperFiatId} params.defaultFiat - The default fiat currency.
 * @param {OnramperId} params.defaultCrypto - The optional default cryptocurrency.
 * @param {OnramperId[]} params.onlyCryptos - The list of allowed cryptocurrencies.
 * @param {OnramperNetworkId[]} params.onlyCryptoNetworks - The list of allowed cryptocurrency networks.
 * @param {OnramperCryptoWallet} params.wallets - The list of combination of cryptocurrency and wallet addresses.
 * @param {boolean} params.supportRecurringPayments - Whether to support recurring payments.
 * @param {boolean} params.enableCountrySelector - Whether to enable the country selector.
 * @returns The Onramper source link.
 */
export const buildOnramperLink = ({ wallets, ...params }: BuildOnramperLinkParams) =>
	`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}&${toQueryString(params)}&wallets=${walletsToParam(wallets)}`;
