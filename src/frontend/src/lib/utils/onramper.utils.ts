import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/onramper.env';
import type {
	OnramperCryptoWallet,
	OnramperFiatId,
	OnramperId,
	OnramperMode,
	OnramperNetworkId,
	OnramperWalletAddress
} from '$lib/types/onramper';
import type { Token, TokenStandard } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
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
 *
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

/** Map a list of tokens to a list of Onramper wallets.
 *
 * The Onramper widget requires a list wallet addresses that are a combination of a token ID and a wallet address, to which send the tokens.
 * For example: `btc:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` or `eth:0x0000000123456789abcdef0123456789abcdef0123`.
 * The documentation can be found here: https://docs.onramper.com/docs/supported-widget-parameters#wallets
 *
 * So we map each token to a wallet address, based on the token standard, and create a list of objects with the token ID and the wallet address.
 *
 * @param tokens - The list of tokens to map.
 * @param walletMap - The map of token standards to wallet addresses.
 */
export const mapOnramperWallets = ({
	tokens,
	walletMap
}: {
	tokens: Token[];
	walletMap: { [key in TokenStandard]: Option<OnramperWalletAddress> };
}): OnramperCryptoWallet[] =>
	tokens.reduce<OnramperCryptoWallet[]>((acc, { buy, standard }) => {
		const { onramperId: cryptoId } = buy ?? {};
		const wallet = walletMap[standard];

		return nonNullish(cryptoId) && nonNullish(wallet)
			? [
					...acc,
					{
						cryptoId,
						wallet
					}
				]
			: acc;
	}, []);
