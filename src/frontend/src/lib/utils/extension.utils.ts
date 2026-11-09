import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	OISY_EXTENSION_BLOCKED_VERSIONS,
	OISY_EXTENSION_INTERNAL_ERROR_CODE,
	OISY_EXTENSION_MIN_VERSION,
	OISY_EXTENSION_USER_REJECTED_CODE,
	OISY_EXTENSION_WALLET_CONNECT_TOPIC
} from '$lib/constants/extension.constants';
import type { ExchangeData } from '$lib/stores/exchange.store';
import type { CoingeckoSimplePrice } from '$lib/types/coingecko';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	ExtensionError,
	ExtensionPanelSnapshot,
	ExtensionPanelSnapshotHolding,
	ExtensionPanelSnapshotRow,
	ExtensionSignRequest,
	ExtensionVersionStatus
} from '$lib/types/extension';
import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { CardData } from '$lib/types/token-card';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { usdValue } from '$lib/utils/exchange.utils';
import { mapHeaderData } from '$lib/utils/token-card.utils';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import { getSdkError } from '@walletconnect/utils';

// The extension names Solana methods after the Wallet Standard features; the review screens expect
// WalletConnect's names.
const SOL_METHODS: Record<string, string> = {
	sol_signMessage: SESSION_REQUEST_SOL_SIGN_MESSAGE,
	sol_signTransaction: SESSION_REQUEST_SOL_SIGN_TRANSACTION,
	sol_signAndSendTransaction: SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION
};

/**
 * Shape an extension sign request like a WalletConnect session request, so the existing review
 * screens can show and sign it unchanged. Returns `undefined` for a method they cannot handle.
 */
export const toWalletConnectSessionRequest = ({
	request: { chain, method, params, origin, address },
	id
}: {
	request: ExtensionSignRequest;
	id: number;
}): WalletKitTypes.SessionRequest | undefined => {
	// Nothing verifies the site's domain for extension requests, so the review must not present the
	// origin as verified. The origin itself comes from the browser, through the extension.
	const verifyContext: WalletKitTypes.SessionRequest['verifyContext'] = {
		verified: { origin, validation: 'UNKNOWN', verifyUrl: '' }
	};

	if (chain === 'eth') {
		return {
			id,
			topic: OISY_EXTENSION_WALLET_CONNECT_TOPIC,
			params: {
				chainId: `eip155:${SEPOLIA_NETWORK.chainId}`,
				request: { method, params }
			},
			verifyContext
		};
	}

	const solMethod = SOL_METHODS[method];

	if (isNullish(solMethod)) {
		return;
	}

	const { message, transaction } = (params ?? {}) as { message?: string; transaction?: string };

	return {
		id,
		topic: OISY_EXTENSION_WALLET_CONNECT_TOPIC,
		params: {
			chainId: `solana:${SOLANA_DEVNET_NETWORK.chainId}`,
			request: {
				method: solMethod,
				params:
					solMethod === SESSION_REQUEST_SOL_SIGN_MESSAGE
						? { message, pubkey: address }
						: { transaction }
			}
		},
		verifyContext
	};
};

/**
 * Translate a WalletConnect error into the EIP-1193 code a dapp expects: 4001 when the user
 * rejected, an internal error otherwise.
 */
export const toExtensionError = ({ code, message }: ErrorResponse): ExtensionError => ({
	code:
		code === getSdkError('USER_REJECTED').code
			? OISY_EXTENSION_USER_REJECTED_CODE
			: OISY_EXTENSION_INTERNAL_ERROR_CODE,
	message
});

// A Chrome extension version is one to four dot-separated integers, e.g. `1.4` or `2.0.0.17`.
const parseExtensionVersion = (version: string): number[] | undefined => {
	const parts = version.split('.');

	if (parts.length > 4 || parts.some((part) => !/^\d+$/.test(part))) {
		return;
	}

	return parts.map(Number);
};

/**
 * Compare two Chrome extension versions; missing parts count as zero. Returns a negative number when
 * `a` is older, zero when equal, a positive number when newer, and `undefined` if either is invalid.
 */
export const compareExtensionVersions = ({
	a,
	b
}: {
	a: string;
	b: string;
}): number | undefined => {
	const left = parseExtensionVersion(a);
	const right = parseExtensionVersion(b);

	if (isNullish(left) || isNullish(right)) {
		return;
	}

	for (let index = 0; index < Math.max(left.length, right.length); index++) {
		const difference = (left[index] ?? 0) - (right[index] ?? 0);

		if (difference !== 0) {
			return difference;
		}
	}

	return 0;
};

/**
 * Whether OISY should answer an extension that reports this version. A missing or malformed version
 * is not trusted. This keeps old, honest versions out; it can't catch a malicious version, which
 * controls what it reports.
 */
export const extensionVersionStatus = ({
	version,
	minimum = OISY_EXTENSION_MIN_VERSION,
	blocked = OISY_EXTENSION_BLOCKED_VERSIONS
}: {
	version: string | undefined;
	minimum?: string;
	blocked?: readonly string[];
}): ExtensionVersionStatus => {
	if (isNullish(version)) {
		return 'outdated';
	}

	if (blocked.includes(version)) {
		return 'blocked';
	}

	const comparison = compareExtensionVersions({ a: version, b: minimum });

	if (isNullish(comparison)) {
		return 'blocked';
	}

	return comparison < 0 ? 'outdated' : 'supported';
};

type PriceKeyOf = (token: TokenUi) => string | undefined;

const priceOf = ({
	prices,
	priceKey
}: {
	prices: ExchangeData;
	priceKey: string | undefined;
}): CoingeckoSimplePrice | undefined =>
	isNullish(priceKey)
		? undefined
		: (prices as Record<string, CoingeckoSimplePrice> | null | undefined)?.[priceKey];

// OISY matches prices to tokens through token lists that need a session (`exchanges`). The panel
// keeps, per token, the entry of OISY's price data that token's price came from instead, so it can
// look the price up again once the session has ended.
export const findExtensionPriceKey = ({
	price,
	prices
}: {
	price: ExchangesData[TokenId];
	prices: ExchangeData;
}): string | undefined => {
	if (isNullish(price) || isNullish(prices)) {
		return;
	}

	const same = (candidate: CoingeckoSimplePrice): boolean =>
		candidate === price ||
		(candidate.usd === price.usd &&
			candidate.usd_market_cap === price.usd_market_cap &&
			candidate.usd_24h_change === price.usd_24h_change);

	return Object.entries(prices as Record<string, CoingeckoSimplePrice>).find(([, candidate]) =>
		same(candidate)
	)?.[0];
};

export const toExtensionPanelSnapshotHolding = ({
	token: { balance, decimals, usdBalance },
	priceKey
}: {
	token: TokenUi;
	priceKey: string | undefined;
}): ExtensionPanelSnapshotHolding | undefined =>
	isNullish(balance) || balance === ZERO ? undefined : { priceKey, balance, decimals, usdBalance };

const toHoldings = ({
	tokens,
	priceKeyOf
}: {
	tokens: TokenUi[];
	priceKeyOf: PriceKeyOf;
}): ExtensionPanelSnapshotHolding[] =>
	tokens
		.map((token) => toExtensionPanelSnapshotHolding({ token, priceKey: priceKeyOf(token) }))
		.filter(nonNullish);

export const toExtensionPanelSnapshotRow = ({
	tokenOrGroup,
	priceKeyOf
}: {
	tokenOrGroup: TokenUiOrGroupUi;
	priceKeyOf: PriceKeyOf;
}): ExtensionPanelSnapshotRow => {
	if (isTokenUiGroup(tokenOrGroup)) {
		const { group } = tokenOrGroup;
		const {
			name,
			symbol,
			decimals,
			icon,
			oisyName,
			oisySymbol,
			balance,
			usdBalance,
			usdPrice,
			usdPriceChangePercentage24h
		} = mapHeaderData(group);

		return {
			name,
			symbol,
			decimals,
			icon,
			oisyName,
			oisySymbol,
			balance,
			usdBalance,
			usdPrice,
			usdPriceChangePercentage24h,
			groupNetworkIds: group.tokens.map(({ network: { id } }) => `${id.description}`),
			holdings: toHoldings({ tokens: group.tokens, priceKeyOf })
		};
	}

	const { token } = tokenOrGroup;
	const {
		name,
		symbol,
		decimals,
		icon,
		oisyName,
		oisySymbol,
		balance,
		usdBalance,
		usdPrice,
		usdPriceChangePercentage24h,
		network
	} = token;

	return {
		name,
		symbol,
		decimals,
		icon,
		oisyName,
		oisySymbol,
		balance,
		usdBalance,
		usdPrice,
		usdPriceChangePercentage24h,
		networkId: `${network.id.description}`,
		holdings: toHoldings({ tokens: [token], priceKeyOf })
	};
};

const findNetwork = (networkId: string | undefined): Network | undefined =>
	isNullish(networkId)
		? undefined
		: SUPPORTED_NETWORKS.find(({ id }) => id.description === networkId);

// A holding at its live price when there is one, otherwise at its saved value.
const holdingUsdValue = ({
	holding: { priceKey, balance, decimals, usdBalance },
	prices
}: {
	holding: ExtensionPanelSnapshotHolding;
	prices: ExchangeData;
}): number => {
	const price = priceOf({ prices, priceKey });

	return nonNullish(price)
		? usdValue({ decimals, balance, exchangeRate: price.usd })
		: (usdBalance ?? 0);
};

export const toExtensionPanelSnapshotCardData = ({
	row: { networkId, groupNetworkIds, holdings, ...row },
	prices
}: {
	row: ExtensionPanelSnapshotRow;
	prices: ExchangeData;
}): CardData => {
	const price = (holdings ?? [])
		.map(({ priceKey }) => priceOf({ prices, priceKey }))
		.find(nonNullish);

	return {
		...row,
		...(nonNullish(price) && nonNullish(holdings)
			? {
					usdPrice: price.usd,
					usdPriceChangePercentage24h: price.usd_24h_change,
					usdBalance: holdings.reduce(
						(sum, holding) => sum + holdingUsdValue({ holding, prices }),
						0
					)
				}
			: {}),
		network: findNetwork(networkId),
		...(nonNullish(groupNetworkIds)
			? {
					tokenCount: groupNetworkIds.length,
					networks: groupNetworkIds.map(findNetwork).filter(nonNullish)
				}
			: {})
	};
};

// The same sum as OISY's total: every held token, at live prices where there are some, plus the
// value held with providers as saved.
export const extensionPanelSnapshotUsdTotal = ({
	snapshot: { usdTotal, holdings, providersUsd },
	prices
}: {
	snapshot: ExtensionPanelSnapshot;
	prices: ExchangeData;
}): number =>
	isNullish(holdings)
		? usdTotal
		: holdings.reduce(
				(sum, holding) => sum + holdingUsdValue({ holding, prices }),
				providersUsd ?? 0
			);

export const extensionPanelSnapshotHasLivePrices = ({
	snapshot: { holdings },
	prices
}: {
	snapshot: ExtensionPanelSnapshot;
	prices: ExchangeData;
}): boolean => (holdings ?? []).some(({ priceKey }) => nonNullish(priceOf({ prices, priceKey })));
