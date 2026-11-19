import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/rest/onramper.env';
import type { Erc20Token } from '$eth/types/erc20';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { signOnramperWidgetUrl } from '$lib/api/backend.api';
import { ONRAMPER_IDS_GRACE_MS } from '$lib/constants/onramper.constants';
import type { Network } from '$lib/types/network';
import type {
	OnramperCryptoWallet,
	OnramperFiatId,
	OnramperId,
	OnramperIds,
	OnramperIdsByAddress,
	OnramperIdsLoading,
	OnramperMode,
	OnramperNetworkId,
	OnramperNetworkWallet,
	OnramperPaymentMethodId,
	OnramperSupportedCrypto,
	OnramperWalletAddress
} from '$lib/types/onramper';
import type { Token } from '$lib/types/token';
import { withDeadline } from '$lib/utils/timeout.utils';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import type { Identity } from '@icp-sdk/core/agent';

export interface OnramperLinkParams {
	mode: OnramperMode;
	defaultFiat?: OnramperFiatId;
	defaultCrypto?: OnramperId;
	defaultPaymentMethod?: OnramperPaymentMethodId;
	onlyCryptos: OnramperId[];
	onlyCryptoNetworks: OnramperNetworkId[];
	// The Sell tab ignores the fields above and reads its own `sell_*` copies of them.
	sell_defaultFiat?: OnramperFiatId;
	sell_defaultCrypto?: OnramperId;
	sell_onlyCryptos?: OnramperId[];
	sell_onlyCryptoNetworks?: OnramperNetworkId[];
	supportRecurringPayments: boolean;
	enableCountrySelector: boolean;
	themeName: 'dark' | 'light' | 'bluey';
}

export interface BuildOnramperLinkParams {
	identity: Identity;
	wallets: OnramperCryptoWallet[];
	networkWallets: OnramperNetworkWallet[];
	// OnRamper's lists for the tokens without a built-in id, still loading while the backend signs.
	onramperIds?: OnramperIdsLoading;
	toParams: (onramperIds?: OnramperIds) => OnramperLinkParams;
}

// Each list gets the grace on its own, so that a list that came in is kept when the other is late.
const onramperIdsInTime = async ({ buy, sell }: OnramperIdsLoading): Promise<OnramperIds> => {
	const inTime = (list: Promise<OnramperIdsByAddress | undefined>) =>
		withDeadline<OnramperIdsByAddress | undefined>({
			operation: list,
			fallback: undefined,
			milliseconds: ONRAMPER_IDS_GRACE_MS
		});

	const [buyIds, sellIds] = await Promise.all([inTime(buy), inTime(sell)]);

	return { buy: buyIds, sell: sellIds };
};

const arrayToParam = (array: OnramperId[] | OnramperNetworkId[]) => array.join(',');

const toQueryString = (params: OnramperLinkParams) =>
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
 * OnRamper's lists for the tokens without a built-in id are loaded while the backend signs, so they
 * usually add no wait. A list still loading once the URL is signed gets `ONRAMPER_IDS_GRACE_MS`
 * more; then the link is built without that list, keeping the other one if it came in. The token
 * ids are not signed, so they never delay or repeat the signing call.
 *
 * The documentation for the OnRamper widget's parameters can be found here:
 * https://docs.onramper.com/docs/supported-widget-parameters
 *
 * @param params - The parameters to build the link with.
 * @param params.identity - The authenticated identity used to call the backend signing endpoint.
 * @param params.wallets - The list of combination of cryptocurrency and wallet addresses.
 * @param params.networkWallets - The list of combination of network and wallet addresses.
 * @param params.onramperIds - The optional, still loading ids from OnRamper's lists.
 * @param params.toParams - Gives the widget's parameters, with the ids from OnRamper's lists when
 * they came in time.
 * @returns The signed OnRamper source link.
 * @throws If the backend signing call fails (e.g. the OnRamper signing secret is not configured).
 */
export const buildOnramperLink = async ({
	identity,
	wallets,
	networkWallets,
	onramperIds,
	toParams
}: BuildOnramperLinkParams): Promise<string> => {
	const { signature, signed_query } = await signOnramperWidgetUrl({
		identity,
		wallets,
		networkWallets
	});

	const ids = isNullish(onramperIds) ? undefined : await onramperIdsInTime(onramperIds);

	const signedParams = signed_query.length > 0 ? `&${signed_query}` : '';

	return `${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}&${toQueryString(toParams(ids))}${signedParams}&signature=${signature}`;
};

// EVM addresses are the same in any letter case. Solana mints are not, and never start with `0x`.
const toOnramperAddressKey = ({
	network,
	address
}: {
	network: string;
	address: string;
}): string => {
	const lowerCase = address.toLowerCase();

	return `${network}:${lowerCase.startsWith('0x') ? lowerCase : address}`;
};

/**
 * Index one of OnRamper's lists of supported tokens by network and address, to find the id of a
 * token that has no built-in one.
 *
 * A token without an address can't be matched and is left out. So is an address the list gives
 * under more than one id: offering the wrong one would buy or sell another token than the one the
 * user holds.
 *
 * @param cryptos - The tokens of one of OnRamper's lists.
 * @returns OnRamper's id of each address, keyed by network and address.
 */
export const indexOnramperIds = (cryptos: OnramperSupportedCrypto[]): OnramperIdsByAddress => {
	const ids: OnramperIdsByAddress = new Map();
	const ambiguous = new Set<string>();

	cryptos.forEach(({ id, network, address }) => {
		if (isNullish(address) || address === '') {
			return;
		}

		const key = toOnramperAddressKey({ network, address });
		const listed = ids.get(key);

		if (ambiguous.has(key) || listed === id) {
			return;
		}

		if (nonNullish(listed)) {
			ids.delete(key);
			ambiguous.add(key);
			return;
		}

		ids.set(key, id);
	});

	return ids;
};

// Only ERC-20 and SPL tokens are looked up: OnRamper lists no ICRC token.
const isOnramperLookupToken = (token: Token): token is Erc20Token | SplToken =>
	(isTokenErc20(token) || isTokenSpl(token)) && nonNullish(token.network.buy);

/**
 * Whether any of the tokens could find its id in OnRamper's lists: an ERC-20 or SPL token on a
 * network OnRamper covers, with or without a built-in id, since the id from the list wins.
 *
 * @param tokens - The tokens to check.
 * @returns True if OnRamper's lists are worth loading for these tokens.
 */
export const needsOnramperIdLookup = (tokens: Token[]): boolean =>
	tokens.some(isOnramperLookupToken);

/**
 * The OnRamper id of a token: the one OnRamper's list gives its network and address, else its
 * built-in one.
 *
 * The list wins, so that a built-in id that OnRamper no longer uses cannot hide the token. The
 * built-in id covers what is not matched: native coins, which OISY holds without an address, tokens
 * the list has without an address or under more than one id, and a list that is late or failed.
 *
 * @param params - The parameters.
 * @param params.token - The token.
 * @param params.ids - One of OnRamper's lists, indexed with `indexOnramperIds`, if it came in.
 * @returns The token's OnRamper id, if it has one.
 */
export const findOnramperId = ({
	token,
	ids
}: {
	token: Token;
	ids?: OnramperIdsByAddress;
}): OnramperId | undefined => {
	const builtIn = token.buy?.onramperId;
	const network = token.network.buy?.onramperId;

	if (isNullish(ids) || isNullish(network) || !isOnramperLookupToken(token)) {
		return builtIn;
	}

	return ids.get(toOnramperAddressKey({ network, address: token.address })) ?? builtIn;
};

/**
 * The tokens one tab of the widget offers, and the one it opens on.
 *
 * @param params - The parameters.
 * @param params.selectedNetworkTokens - The enabled tokens of the selected network.
 * @param params.enabledTokens - All enabled tokens.
 * @param params.openTokens - The open token, then the asset of the open vault.
 * @param params.ids - The tab's list of OnRamper, indexed with `indexOnramperIds`, if it came in.
 * @returns The `defaultCrypto` and `onlyCryptos` of the tab.
 */
export const toOnramperTokenParams = ({
	selectedNetworkTokens,
	enabledTokens,
	openTokens,
	ids
}: {
	selectedNetworkTokens: Token[];
	enabledTokens: Token[];
	openTokens: Token[];
	ids?: OnramperIdsByAddress;
}): Pick<OnramperLinkParams, 'defaultCrypto' | 'onlyCryptos'> => {
	const toOnramperIds = (tokens: Token[]): OnramperId[] =>
		tokens.map((token) => findOnramperId({ token, ids })).filter(nonNullish);

	// OnRamper ignores `onlyCryptoNetworks` whenever `onlyCryptos` is set, so the selected network
	// has to narrow the tokens themselves.
	const selectedNetworkOnlyCryptos = toOnramperIds(selectedNetworkTokens);

	return {
		// Only an open token or vault sets the default. Without one, OnRamper picks its own, which
		// avoids opening on a token that none of the enabled onramps offers.
		defaultCrypto: toOnramperIds(openTokens)[0],
		// A selected network with no token that OnRamper offers (e.g. XRP) keeps all enabled tokens:
		// an empty list would drop the parameter, and OnRamper would then offer every token it has on
		// our networks.
		onlyCryptos:
			selectedNetworkOnlyCryptos.length > 0
				? selectedNetworkOnlyCryptos
				: toOnramperIds(enabledTokens)
	};
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
