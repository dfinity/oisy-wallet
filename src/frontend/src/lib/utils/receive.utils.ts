import type { BtcAddress } from '$btc/types/address';
import { CK_USDC_CONVERSION_ENABLED } from '$env/convert.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { IC_CKUSDC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import type { EthAddress } from '$eth/types/address';
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
	ReceiveAddressState,
	ReceiveAsset,
	ReceiveIcpAddressFormat,
	ReceiveRoute
} from '$lib/types/receive';
import type { OptionString } from '$lib/types/string';
import type { Token, TokenId } from '$lib/types/token';
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
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import type { SolAddress } from '$sol/types/address';
import type { XrpAddress } from '$xrp/types/address';
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
			versions.find((token) => !isTokenToggleable(token) || token.enabled) ??
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
 * Bitcoin deposit after ckBTC's direct route. The preferred network's routes come first.
 */
export const getReceiveRoutes = ({
	tokens,
	enabledNetworkIds,
	preferredNetworkId
}: {
	tokens: Token[];
	enabledNetworkIds: NetworkId[];
	preferredNetworkId?: NetworkId;
}): ReceiveRoute[] => {
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
			acc.push({
				key: `ckbtc-deposit:${getReceiveTokenKey(token)}`,
				kind: 'ckbtc-deposit',
				sourceToken: depositSourceToken,
				sourceNetwork: depositSourceToken.network,
				creditedToken: token,
				addressKind: 'ckbtc-deposit'
			});
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

// The route a selection goes to without asking: only a single direct transfer.
export const getAutoReceiveRoute = (routes: ReceiveRoute[]): ReceiveRoute | undefined => {
	const [route, ...rest] = routes;

	return rest.length === 0 && route?.kind === 'direct' ? route : undefined;
};

export const isReceiveTokenEnabled = (token: Token): boolean =>
	!isTokenToggleable(token) || token.enabled;

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

export interface ReceiveAddressSources {
	icrcAddress: OptionString;
	icpAccountId: OptionString;
	evm: AddressStoreData<EthAddress>;
	btcMainnet: AddressStoreData<BtcAddress>;
	btcTestnet: AddressStoreData<BtcAddress>;
	btcRegtest: AddressStoreData<BtcAddress>;
	solMainnet: AddressStoreData<SolAddress>;
	solDevnet: AddressStoreData<SolAddress>;
	solLocal: AddressStoreData<SolAddress>;
	xrpMainnet: AddressStoreData<XrpAddress>;
	// The ckBTC minter's Bitcoin deposit addresses, by ckBTC token.
	ckBtcDeposit: Record<TokenId, BtcAddressData | null> | undefined;
}

const LOADING: ReceiveAddressState = { status: 'loading' };

// `undefined` is still loading, `null` failed, and an address counts only once it is certified.
const fromCertifiedStore = (
	data: AddressStoreData<string> | BtcAddressData | undefined
): ReceiveAddressState =>
	data === null
		? { status: 'error' }
		: nonNullish(data) && data.certified
			? { status: 'ready', address: data.data }
			: LOADING;

const fromText = (address: OptionString): ReceiveAddressState =>
	nonNullish(address) ? { status: 'ready', address } : LOADING;

const networkStore = ({
	networkId,
	sources
}: {
	networkId: NetworkId;
	sources: ReceiveAddressSources;
}): AddressStoreData<string> | undefined =>
	isNetworkIdBTCMainnet(networkId)
		? sources.btcMainnet
		: isNetworkIdBTCTestnet(networkId)
			? sources.btcTestnet
			: isNetworkIdBTCRegtest(networkId)
				? sources.btcRegtest
				: isNetworkIdSOLMainnet(networkId)
					? sources.solMainnet
					: isNetworkIdSOLDevnet(networkId)
						? sources.solDevnet
						: isNetworkIdSOLLocal(networkId)
							? sources.solLocal
							: isNetworkIdXRPMainnet(networkId)
								? sources.xrpMainnet
								: undefined;

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
		case 'evm':
			return fromCertifiedStore(sources.evm);
		case 'ckbtc-deposit':
			return fromCertifiedStore(sources.ckBtcDeposit?.[creditedToken.id]);
		case 'btc':
		case 'sol':
		case 'xrp':
			return fromCertifiedStore(networkStore({ networkId: sourceNetwork.id, sources }));
	}
};
