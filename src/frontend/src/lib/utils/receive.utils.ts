import { isBitcoinToken } from '$btc/utils/token.utils';
import { CK_USDC_CONVERSION_ENABLED } from '$env/convert.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { IC_CKUSDC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import type { BtcAddressData } from '$icp/stores/btc.store';
import { isTokenIcTestnet } from '$icp/utils/ic-ledger.utils';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { isTokenIc, isTokenIcp } from '$icp/utils/icrc.utils';
import { isIcCkToken } from '$icp/validation/ic-token.validation';
import type { AddressStoreData } from '$lib/stores/address.store';
import type { NetworkId } from '$lib/types/network';
import type {
	ReceiveAddressKind,
	ReceiveAddressSources,
	ReceiveAddressState,
	ReceiveAddressTexts,
	ReceiveAsset,
	ReceiveIcpAddressFormat,
	ReceiveNetworkAddressSource,
	ReceiveRoute
} from '$lib/types/receive';
import type { OptionString } from '$lib/types/string';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getTokenIdentifier } from '$lib/utils/identifier.utils';
import {
	isNetworkIdBitcoin,
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSolana,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdXrp,
	isNetworkIdXRPMainnet
} from '$lib/utils/network.utils';
import { isTokenEnabled } from '$lib/utils/token-toggleable.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const isReceiveTestToken = (token: Token): boolean =>
	token.network.env === 'testnet' || (isTokenIc(token) && isTokenIcTestnet(token));

/**
 * The identity of an exact token: its network and its contract, mint or ledger, or its symbol for a
 * native token (one per network). Unlike a `TokenId`, it survives the reload that replaces a catalog
 * placeholder with the token the user enabled.
 */
export const getReceiveTokenKey = (token: Token): string =>
	`${token.network.id.description}:${getTokenIdentifier(token) ?? token.symbol}`;

/**
 * Receive treats versions on several networks as one asset only through the curated token group,
 * and never for a token on the Internet Computer or a test network: a chain-key token or a bridged
 * ICRC version is a different asset from the one it is twinned with, even where the portfolio shows
 * them together.
 */
const getReceiveGroupKey = (token: Token): string | undefined => {
	const groupId = token.groupData?.id;

	if (isNullish(groupId) || isNetworkIdICP(token.network.id) || isReceiveTestToken(token)) {
		return undefined;
	}

	return `group:${groupId.description}`;
};

export const getReceiveAssetKey = (token: Token): string =>
	getReceiveGroupKey(token) ?? `token:${getReceiveTokenKey(token)}`;

/**
 * The entries of the token picker, in the order of the given tokens, with the entries that have a
 * version on the preferred network first.
 */
export const getReceiveAssets = ({
	tokens,
	preferredNetworkId
}: {
	tokens: Token[];
	preferredNetworkId?: NetworkId;
}): ReceiveAsset[] => {
	const groups = tokens.reduce<Map<string, Token[]>>((acc, token) => {
		const key = getReceiveAssetKey(token);
		acc.set(key, [...(acc.get(key) ?? []), token]);
		return acc;
	}, new Map());

	const assets = [...groups.entries()].map(([key, versions]) => ({
		key,
		tokens: versions,
		token:
			versions.find(({ network: { id } }) => id === preferredNetworkId) ??
			versions.find(isTokenEnabled) ??
			versions[0]
	}));

	if (isNullish(preferredNetworkId)) {
		return assets;
	}

	const onPreferredNetwork = ({ tokens }: ReceiveAsset): boolean =>
		tokens.some(({ network: { id } }) => id === preferredNetworkId);

	return [
		...assets.filter((asset) => onPreferredNetwork(asset)),
		...assets.filter((asset) => !onPreferredNetwork(asset))
	];
};

export const findReceiveAssetByToken = ({
	assets,
	token
}: {
	assets: ReceiveAsset[];
	token: Token;
}): ReceiveAsset | undefined => {
	const key = getReceiveTokenKey(token);

	return assets.find(({ tokens }) => tokens.some((t) => getReceiveTokenKey(t) === key));
};

export const getReceiveAddressKind = (token: Token): ReceiveAddressKind | undefined => {
	const {
		network: { id }
	} = token;

	if (isNetworkIdICP(id)) {
		return isTokenIcp(token) ? 'icp' : 'icrc';
	}

	if (isNetworkIdEthereum(id) || isNetworkIdEvm(id)) {
		return 'evm';
	}

	if (isNetworkIdBitcoin(id)) {
		return 'btc';
	}

	if (isNetworkIdSolana(id)) {
		return 'sol';
	}

	if (isNetworkIdXrp(id)) {
		return 'xrp';
	}
};

/**
 * OISY can credit a Bitcoin deposit as ckBTC only where it also checks the deposit and asks the
 * minter to mint: the background check runs for the mainnet ckBTC ledger and its Bitcoin twin.
 */
export const getCkBtcDepositSourceToken = ({
	token,
	enabledNetworkIds
}: {
	token: Token;
	enabledNetworkIds: NetworkId[];
}): Token | undefined => {
	if (!isTokenCkBtcLedger(token) || !isIcCkToken(token)) {
		return;
	}

	const { twinToken, minterCanisterId, ledgerCanisterId } = token;

	if (
		isNullish(twinToken) ||
		isNullish(minterCanisterId) ||
		ledgerCanisterId !== IC_CKBTC_LEDGER_CANISTER_ID ||
		!isNetworkIdBTCMainnet(twinToken.network.id) ||
		!enabledNetworkIds.includes(twinToken.network.id)
	) {
		return;
	}

	return twinToken;
};

/**
 * The routes of an asset, on the enabled networks only: a direct transfer for each version, and a
 * Bitcoin deposit after ckBTC's direct route. Native BTC also offers that deposit after its own
 * route, when the catalog has the ckBTC it credits: receiving as ckBTC is a choice the user makes.
 * The preferred network's routes come first.
 */
export const getReceiveRoutes = ({
	tokens,
	enabledNetworkIds,
	preferredNetworkId,
	catalog = []
}: {
	tokens: Token[];
	enabledNetworkIds: NetworkId[];
	preferredNetworkId?: NetworkId;
	// The whole catalog, where Receive finds the ckBTC a Bitcoin deposit credits.
	catalog?: Token[];
}): ReceiveRoute[] => {
	const depositRoute = ({
		creditedToken,
		sourceToken
	}: {
		creditedToken: Token;
		sourceToken: Token;
	}): ReceiveRoute => ({
		key: `ckbtc-deposit:${getReceiveTokenKey(creditedToken)}`,
		kind: 'ckbtc-deposit',
		sourceToken,
		sourceNetwork: sourceToken.network,
		creditedToken,
		addressKind: 'ckbtc-deposit'
	});

	const routes = tokens.reduce<ReceiveRoute[]>((acc, token) => {
		const addressKind = getReceiveAddressKind(token);

		if (isNullish(addressKind) || !enabledNetworkIds.includes(token.network.id)) {
			return acc;
		}

		acc.push({
			key: `direct:${getReceiveTokenKey(token)}`,
			kind: 'direct',
			sourceToken: token,
			sourceNetwork: token.network,
			creditedToken: token,
			addressKind
		});

		const depositSourceToken = getCkBtcDepositSourceToken({ token, enabledNetworkIds });

		if (nonNullish(depositSourceToken)) {
			acc.push(depositRoute({ creditedToken: token, sourceToken: depositSourceToken }));
		}

		const ckBtc = isBitcoinToken(token)
			? catalog.find(
					(candidate) =>
						getCkBtcDepositSourceToken({ token: candidate, enabledNetworkIds })?.network.id ===
						token.network.id
				)
			: undefined;

		if (nonNullish(ckBtc)) {
			acc.push(depositRoute({ creditedToken: ckBtc, sourceToken: token }));
		}

		return acc;
	}, []);

	if (isNullish(preferredNetworkId)) {
		return routes;
	}

	const onPreferredNetwork = ({ sourceNetwork: { id } }: ReceiveRoute): boolean =>
		id === preferredNetworkId;

	return [
		...routes.filter((route) => onPreferredNetwork(route)),
		...routes.filter((route) => !onPreferredNetwork(route))
	];
};

/**
 * A route that credits another asset than the one picked, such as BTC deposited as ckBTC: an
 * alternative way to receive it, rather than another network for the same asset.
 */
export const isReceiveConversionOffer = ({
	route: { kind, creditedToken },
	assetTokens
}: {
	route: ReceiveRoute;
	assetTokens: Token[];
}): boolean => {
	const creditedKey = getReceiveTokenKey(creditedToken);

	return (
		kind === 'ckbtc-deposit' && !assetTokens.some((t) => getReceiveTokenKey(t) === creditedKey)
	);
};

// The route a selection goes to without asking: only a single direct transfer.
export const getAutoReceiveRoute = (routes: ReceiveRoute[]): ReceiveRoute | undefined => {
	const [route, ...rest] = routes;

	return rest.length === 0 && route?.kind === 'direct' ? route : undefined;
};

/**
 * The Ethereum twin a ck token converts from, when Convert supports it on an enabled network:
 * ckETH and the ckERC20 tokens, from Ethereum or Sepolia.
 */
export const getReceiveConvertTwinToken = ({
	token,
	enabledNetworkIds
}: {
	token: Token;
	enabledNetworkIds: NetworkId[];
}): Token | undefined => {
	if (!(isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token)) || !isIcCkToken(token)) {
		return;
	}

	const { twinToken, ledgerCanisterId } = token;

	if (
		isNullish(twinToken) ||
		!isNetworkIdEthereum(twinToken.network.id) ||
		!enabledNetworkIds.includes(twinToken.network.id)
	) {
		return;
	}

	if (ledgerCanisterId === IC_CKUSDC_LEDGER_CANISTER_ID && !CK_USDC_CONVERSION_ENABLED) {
		return;
	}

	return twinToken;
};

export const RECEIVE_ADDRESS_LOADING_STATE: ReceiveAddressState = { status: 'loading' };

// An address counts only once the backend certified it.
export const getCertifiedAddress = (
	data: AddressStoreData<string> | BtcAddressData | undefined
): string | undefined => (nonNullish(data) && data.certified ? data.data : undefined);

// `undefined` is still loading and `null` failed.
const fromCertifiedStore = (
	data: AddressStoreData<string> | BtcAddressData | undefined
): ReceiveAddressState => {
	if (data === null) {
		return { status: 'error' };
	}

	const address = getCertifiedAddress(data);

	return nonNullish(address) ? { status: 'ready', address } : RECEIVE_ADDRESS_LOADING_STATE;
};

const fromText = (address: OptionString): ReceiveAddressState =>
	nonNullish(address) ? { status: 'ready', address } : RECEIVE_ADDRESS_LOADING_STATE;

// The exact network picks the store of a Bitcoin, Solana or XRP address.
const NETWORK_ADDRESS_SOURCES: [(networkId: NetworkId) => boolean, ReceiveNetworkAddressSource][] =
	[
		[isNetworkIdBTCMainnet, 'btcMainnet'],
		[isNetworkIdBTCTestnet, 'btcTestnet'],
		[isNetworkIdBTCRegtest, 'btcRegtest'],
		[isNetworkIdSOLMainnet, 'solMainnet'],
		[isNetworkIdSOLDevnet, 'solDevnet'],
		[isNetworkIdSOLLocal, 'solLocal'],
		[isNetworkIdXRPMainnet, 'xrpMainnet']
	];

/**
 * The store that holds the address of a route that has one per network: the shared EVM address, or
 * the Bitcoin, Solana or XRP address of its exact network. The ICP formats come from the identity and
 * the ckBTC deposit address from the minter, so they have none.
 */
export const getReceiveNetworkAddressSource = ({
	addressKind,
	sourceNetwork: { id: networkId }
}: Pick<ReceiveRoute, 'addressKind' | 'sourceNetwork'>):
	ReceiveNetworkAddressSource | undefined => {
	if (addressKind === 'evm') {
		return 'evm';
	}

	if (addressKind !== 'btc' && addressKind !== 'sol' && addressKind !== 'xrp') {
		return;
	}

	return NETWORK_ADDRESS_SOURCES.find(([matches]) => matches(networkId))?.[1];
};

/**
 * The destination of a route for the signed-in account, from the stores that already hold it. A
 * route that changes resolves against its own store at once, so an address loaded for another route
 * can never stand in for its own.
 */
export const resolveReceiveAddress = ({
	route: { addressKind, sourceNetwork, creditedToken },
	icpFormat,
	sources
}: {
	route: ReceiveRoute;
	icpFormat: ReceiveIcpAddressFormat;
	sources: ReceiveAddressSources;
}): ReceiveAddressState => {
	switch (addressKind) {
		case 'icp':
			return fromText(icpFormat === 'account-id' ? sources.icpAccountId : sources.icrcAddress);
		case 'icrc':
			return fromText(sources.icrcAddress);
		case 'ckbtc-deposit':
			return fromCertifiedStore(sources.ckBtcDeposit?.[creditedToken.id]);
		default: {
			const source = getReceiveNetworkAddressSource({ addressKind, sourceNetwork });

			return fromCertifiedStore(nonNullish(source) ? sources[source] : undefined);
		}
	}
};

/**
 * The title of the address step restates the option picked before it: "Receive ETH on Ethereum", or
 * for a deposit what arrives as what, "Receive BTC as ckBTC".
 */
export const getReceiveAddressTitle = ({
	route: { kind, sourceToken, sourceNetwork, creditedToken },
	i18n
}: {
	route: ReceiveRoute;
	i18n: I18n;
}): string =>
	kind === 'ckbtc-deposit'
		? replacePlaceholders(i18n.receive.token.text.title_as, {
				$token: getTokenDisplaySymbol(sourceToken),
				$creditedToken: getTokenDisplaySymbol(creditedToken)
			})
		: replacePlaceholders(i18n.receive.token.text.title_direct, {
				$token: getTokenDisplaySymbol(sourceToken),
				$network: sourceNetwork.name
			});

/**
 * How the address of a route is named: next to it, on its Copy button, and once copied. The button
 * is named for what it does; the confirmation says what happened.
 */
export const getReceiveAddressTexts = ({
	route: { kind, addressKind, sourceNetwork },
	icpFormat,
	i18n
}: {
	route: ReceiveRoute;
	icpFormat: ReceiveIcpAddressFormat;
	i18n: I18n;
}): ReceiveAddressTexts => {
	if (kind === 'ckbtc-deposit') {
		const { deposit_address, copy_deposit_address, deposit_address_copied } =
			i18n.receive.ckbtc.text;

		return {
			label: deposit_address,
			copyAriaLabel: copy_deposit_address,
			copiedText: deposit_address_copied
		};
	}

	const { text } = i18n.receive.token;

	if (addressKind === 'icp' && icpFormat === 'account-id') {
		return {
			label: text.account_id_label,
			copyAriaLabel: text.copy_account_id,
			copiedText: i18n.receive.icp.text.account_id_copied
		};
	}

	if (addressKind === 'icp') {
		return {
			label: text.principal_label,
			copyAriaLabel: text.copy_principal,
			copiedText: i18n.receive.icp.text.internet_computer_principal_copied
		};
	}

	const network = { $network: sourceNetwork.name };

	return {
		label: replacePlaceholders(text.address_label, network),
		copyAriaLabel: replacePlaceholders(text.copy_address, network),
		copiedText: replacePlaceholders(text.address_copied, network)
	};
};

/**
 * How a route reads in the route picker. The modal title already says "Receive BTC", so the rows name
 * a choice, never what the sender does. Next to an offer such as BTC credited as ckBTC the choice is
 * not one of network: the plain route reads "Native Bitcoin". Otherwise a row is its network, and
 * only a deposit says more: the wait for the Bitcoin confirmations, after which ckBTC is fast and
 * cheap to move.
 */
export const getReceiveRouteOptionTexts = ({
	route,
	assetTokens,
	withOffer,
	confirmations,
	i18n
}: {
	route: ReceiveRoute;
	assetTokens: Token[];
	// The picker lists an offer among the routes.
	withOffer: boolean;
	// The deposit confirmations the minter requires, once known.
	confirmations?: number | bigint;
	i18n: I18n;
}): { title: string; description?: string } => {
	const { kind, sourceToken, sourceNetwork, creditedToken } = route;

	const depositBenefit = nonNullish(confirmations)
		? replacePlaceholders(i18n.receive.ckbtc.text.benefit, { $count: `${confirmations}` })
		: i18n.receive.ckbtc.text.benefit_generic;

	if (isReceiveConversionOffer({ route, assetTokens })) {
		return {
			title: replacePlaceholders(i18n.receive.ckbtc.text.receive_as, {
				$token: getTokenDisplaySymbol(creditedToken)
			}),
			description: depositBenefit
		};
	}

	if (withOffer) {
		const network = { $network: sourceNetwork.name };

		return {
			title: replacePlaceholders(i18n.receive.token.text.route_native, network),
			description: replacePlaceholders(i18n.receive.token.text.route_native_description, {
				...network,
				$token: getTokenDisplaySymbol(sourceToken)
			})
		};
	}

	return {
		title: sourceNetwork.name,
		...(kind === 'ckbtc-deposit' && { description: depositBenefit })
	};
};
