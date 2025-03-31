import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import type { Network } from '$lib/types/network';
import type {
	OnramperCryptoWallet,
	OnramperFiatId,
	OnramperId,
	OnramperMode,
	OnramperNetworkId,
	OnramperNetworkWallet,
	OnramperWalletAddress
} from '$lib/types/onramper';
import type { Option } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

export interface BuildOnramperLinkParams {
	mode: OnramperMode;
	defaultFiat: OnramperFiatId;
	defaultCrypto?: OnramperId;
	onlyCryptos: OnramperId[];
	onlyCryptoNetworks: OnramperNetworkId[];
	wallets: OnramperCryptoWallet[];
	networkWallets: OnramperNetworkWallet[];
	supportRecurringPayments: boolean;
	enableCountrySelector: boolean;
	themeName: 'dark' | 'light' | 'bluey';
}

const arrayToParam = (array: OnramperId[] | OnramperNetworkId[]) => array.join(',');

const walletToParam = ({ wallet, ...rest }: OnramperCryptoWallet | OnramperNetworkWallet) =>
	'cryptoId' in rest ? `${rest.cryptoId}:${wallet}` : `${rest.networkId}:${wallet}`;

const walletsToParam = (wallets: OnramperCryptoWallet[] | OnramperNetworkWallet[]) =>
	arrayToParam(wallets.map(walletToParam));

const toQueryString = (params: Omit<BuildOnramperLinkParams, 'wallets' | 'networkWallets'>) =>
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
 * @param {OnramperNetworkWallet} params.networkWallets - The list of combination of network and wallet addresses.
 * @param {boolean} params.supportRecurringPayments - Whether to support recurring payments.
 * @param {boolean} params.enableCountrySelector - Whether to enable the country selector.
 * @returns The Onramper source link.
 */
export const buildOnramperLink = ({
	wallets,
	networkWallets,
	...params
}: BuildOnramperLinkParams) => {
	const walletsParam = wallets.length > 0 ? `&wallets=${walletsToParam(wallets)}` : '';
	const networkWalletsParam =
		networkWallets.length > 0 ? `&networkWallets=${walletsToParam(networkWallets)}` : '';

	return `${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}&${toQueryString(params)}${walletsParam}${networkWalletsParam}`;
};

/** Map a list of networks to a list of Onramper wallets.
 *
 * The Onramper widget requires a list of wallet addresses that are a combination of a network ID and a wallet address, to which send the tokens.
 * For example: `bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` or `ethereum:0x0000000123456789abcdef0123456789abcdef0123`.
 * The documentation can be found here: https://docs.onramper.com/docs/supported-widget-parameters#network-wallets
 *
 * So we map each network to a wallet address and create a list of objects with the network ID and the wallet address.
 *
 * @param networks - The list of networks to map.
 * @param walletMap - The map of network ID to wallet addresses.
 */
export const mapOnramperNetworkWallets = ({
	networks,
	walletMap
}: {
	networks: Network[];
	walletMap: Map<symbol, Option<OnramperWalletAddress>>;
}): OnramperNetworkWallet[] =>
	networks.reduce<OnramperNetworkWallet[]>((acc, { buy, id }) => {
		const { onramperId: networkId } = buy ?? {};
		const wallet = walletMap.get(id);

		return nonNullish(networkId) && nonNullish(wallet)
			? [
					...acc,
					{
						networkId,
						wallet
					}
				]
			: acc;
	}, []);
