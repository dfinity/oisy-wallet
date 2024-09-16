import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/onramper.env';
import type {
	CryptoId,
	CryptoNetworkId,
	CryptoWallet,
	FiatId,
	OnRamperMode
} from '$lib/types/onramper';

interface BuildOnRamperLinkParams {
	mode: OnRamperMode;
	defaultFiat: FiatId;
	defaultCrypto?: CryptoId;
	onlyCryptos: CryptoId[];
	onlyCryptoNetworks: CryptoNetworkId[];
	wallets: CryptoWallet[];
	supportRecurringPayments: boolean;
	enableCountrySelector: boolean;
}

const arrayToParam = (array: CryptoId[] | CryptoNetworkId[]) => array.join(',');

const walletToParam = ({ cryptoId, wallet }: CryptoWallet) => `${cryptoId.toUpperCase()}:${wallet}`;

const walletsToParam = (wallets: CryptoWallet[]) => arrayToParam(wallets.map(walletToParam));

const toQueryString = (params: Omit<BuildOnRamperLinkParams, 'wallets'>) =>
	Object.entries(params)
		.map(([key, value]) => `${key}=${Array.isArray(value) ? arrayToParam(value) : value}`)
		.join('&');

export const buildOnRamperLink = ({ wallets, ...params }: BuildOnRamperLinkParams) =>
	`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}&${toQueryString(params)}&wallets=${walletsToParam(wallets)}`;
