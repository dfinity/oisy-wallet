import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/onramper.env';
import type {
	OnRamperMode,
	OnramperCryptoWallet,
	OnramperFiatId,
	OnramperId,
	OnramperNetworkId
} from '$lib/types/onramper';

interface BuildOnRamperLinkParams {
	mode: OnRamperMode;
	defaultFiat: OnramperFiatId;
	defaultCrypto?: OnramperId;
	onlyCryptos: OnramperId[];
	onlyCryptoNetworks: OnramperNetworkId[];
	wallets: OnramperCryptoWallet[];
	supportRecurringPayments: boolean;
	enableCountrySelector: boolean;
}

const arrayToParam = (array: OnramperId[] | OnramperNetworkId[]) => array.join(',');

const walletToParam = ({ cryptoId, wallet }: OnramperCryptoWallet) =>
	`${cryptoId.toUpperCase()}:${wallet}`;

const walletsToParam = (wallets: OnramperCryptoWallet[]) =>
	arrayToParam(wallets.map(walletToParam));

const toQueryString = (params: Omit<BuildOnRamperLinkParams, 'wallets'>) =>
	Object.entries(params)
		.map(([key, value]) => `${key}=${Array.isArray(value) ? arrayToParam(value) : value}`)
		.join('&');

export const buildOnRamperLink = ({ wallets, ...params }: BuildOnRamperLinkParams) =>
	`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}&${toQueryString(params)}&wallets=${walletsToParam(wallets)}`;
