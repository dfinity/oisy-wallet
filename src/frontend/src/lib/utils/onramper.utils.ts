import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import { signOnramperWidgetUrl } from '$lib/api/backend.api';
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
import { nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import type { Identity } from '@icp-sdk/core/agent';

export interface BuildOnramperLinkParams {
	identity: Identity;
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

const toQueryString = (
	params: Omit<BuildOnramperLinkParams, 'identity' | 'wallets' | 'networkWallets'>
) =>
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
 * Build a signed source link for the OnRamper widget, given a set of parameters.
 *
 * OnRamper requires widget URLs to carry an HMAC-SHA256 signature over the three sensitive
 * parameters (`wallets`, `networkWallets`, `walletAddressTags`) since April 2025 — unsigned
 * requests are rejected with `Invalid Signature`. The signing secret is held by the backend
 * canister so it never reaches the frontend bundle; this function calls the canister to obtain
 * both the signature and the exact canonical signed-parameter string it HMAC'd (`signed_query`),
 * appends that string verbatim, and finishes with `&signature=<hex>`. Appending the backend's own
 * serialization (rather than re-deriving `wallets`/`networkWallets` here) guarantees the signed URL
 * params are byte-identical to what was signed.
 *
 * The documentation for the OnRamper widget's parameters can be found here:
 * https://docs.onramper.com/docs/supported-widget-parameters
 *
 * @param params - The parameters to build the link with.
 * @param params.identity - The authenticated identity used to call the backend signing endpoint.
 * @param params.mode - The mode of the widget (buy or sell).
 * @param params.defaultFiat - The default fiat currency.
 * @param params.defaultCrypto - The optional default cryptocurrency.
 * @param params.onlyCryptos - The list of allowed cryptocurrencies.
 * @param params.onlyCryptoNetworks - The list of allowed cryptocurrency networks.
 * @param params.wallets - The list of combination of cryptocurrency and wallet addresses.
 * @param params.networkWallets - The list of combination of network and wallet addresses.
 * @param params.supportRecurringPayments - Whether to support recurring payments.
 * @param params.enableCountrySelector - Whether to enable the country selector.
 * @returns The signed OnRamper source link.
 * @throws If the backend signing call fails (e.g. the OnRamper signing secret is not configured).
 */
export const buildOnramperLink = async ({
	identity,
	wallets,
	networkWallets,
	...params
}: BuildOnramperLinkParams): Promise<string> => {
	const { signature, signed_query } = await signOnramperWidgetUrl({
		identity,
		wallets,
		networkWallets
	});

	const signedParams = signed_query.length > 0 ? `&${signed_query}` : '';

	return `${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}&${toQueryString(params)}${signedParams}&signature=${signature}`;
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
	walletMap: Map<symbol, Nullish<OnramperWalletAddress>>;
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
