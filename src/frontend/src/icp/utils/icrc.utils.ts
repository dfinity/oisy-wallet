import { ICP_NETWORK, ICP_PSEUDO_TESTNET_NETWORK } from '$env/networks/networks.icp.env';
import {
	BITCAT_LEDGER_CANISTER_ID,
	FORSETISCN_LEDGER_CANISTER_ID,
	GHOSTNODE_LEDGER_CANISTER_ID,
	ICONFUCIUS_LEDGER_CANISTER_ID,
	ODINDOG_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcCkInterface, IcFee, IcInterface, IcToken } from '$icp/types/ic-token';
import type {
	IcTokenExtended,
	IcTokenWithoutIdExtended,
	IcrcCustomToken
} from '$icp/types/icrc-custom-token';
import { isTokenIcTestnet } from '$icp/utils/ic-ledger.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { TokenCategory, TokenMetadata } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { UrlSchema } from '$lib/validation/url.validation';
import {
	IcrcMetadataResponseEntries,
	mapTokenMetadata,
	type IcrcTokenMetadataResponse,
	type IcrcValue
} from '@dfinity/ledger-icrc';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

export type IcrcLoadData = Omit<IcInterface, 'explorerUrl'> & {
	metadata: IcrcTokenMetadataResponse;
	category: TokenCategory;
	icrcCustomTokens?: Record<LedgerCanisterIdText, IcTokenWithoutIdExtended>;
};

const CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID: Record<LedgerCanisterIdText, string> = {
	[BITCAT_LEDGER_CANISTER_ID]: 'BITCAT',
	[FORSETISCN_LEDGER_CANISTER_ID]: 'FORSETISCN',
	[GHOSTNODE_LEDGER_CANISTER_ID]: 'GHOSTNODE',
	[ICONFUCIUS_LEDGER_CANISTER_ID]: 'ICONFUCIUS',
	[ODINDOG_LEDGER_CANISTER_ID]: 'ODINDOG'
};

/**
 * Determines which network a given ICRC token belongs to based on its ledger canister ID.
 *
 * Some tokens (e.g., `ckSepoliaETH`, `ckSepoliaUSDC`) are considered "testnet" tokens.
 * These are tied to testnets of external chains (like Sepolia for Ethereum), but since the
 * Internet Computer (IC) does not have a native testnet environment, we fake one.
 *
 * Originally, testnet tokens were shown as part of the IC network, but that led to confusion
 * — especially when aggregating balances — as their balances would mix with mainnet tokens.
 *
 * To avoid this, we now separate these testnet tokens into a pseudo-test network:
 * `ICP_PSEUDO_TESTNET_NETWORK`, which mirrors the IC network in behavior but is visually
 * and logically distinct.
 *
 * This ensures:
 * - Production tokens only show in the "real" IC network (`ICP_NETWORK`)
 * - Testnet tokens only show in the pseudo-network when testnet mode is enabled
 *
 * @param ledgerCanisterId - The ledger canister ID of the token.
 * @returns The appropriate network identifier for the token:
 *          - `ICP_NETWORK` for "mainnet" tokens
 *          - `ICP_PSEUDO_TESTNET_NETWORK` for known "testnet" tokens
 */
const mapIcNetwork = (ledgerCanisterId: LedgerCanisterIdText) =>
	isTokenIcTestnet({ ledgerCanisterId }) ? ICP_PSEUDO_TESTNET_NETWORK : ICP_NETWORK;

export const mapIcrcToken = ({
	metadata,
	icrcCustomTokens,
	ledgerCanisterId,
	...rest
}: IcrcLoadData): IcTokenExtended | undefined => {
	const token = mapOptionalToken(metadata);

	if (isNullish(token)) {
		return undefined;
	}

	const { symbol, icon: tokenIcon, ...metadataToken } = token;

	const staticIcon = `/icons/icrc/${ledgerCanisterId}.png`;

	const dynamicIcon = icrcCustomTokens?.[ledgerCanisterId]?.icon ?? tokenIcon;

	const { success: dynamicIconIsUrl } = UrlSchema.safeParse(dynamicIcon);

	// We do not allow external URLs anyway, so it is safe to use the static icon, even if it does not exist
	const icon = dynamicIconIsUrl ? staticIcon : dynamicIcon;

	return {
		id: parseTokenId(symbol),
		network: mapIcNetwork(ledgerCanisterId),
		standard: icrcCustomTokens?.[ledgerCanisterId]?.standard ?? 'icrc',
		symbol,
		...(notEmptyString(icon) && { icon }),
		...(nonNullish(icrcCustomTokens?.[ledgerCanisterId]?.explorerUrl) && {
			explorerUrl: icrcCustomTokens[ledgerCanisterId].explorerUrl
		}),
		...(nonNullish(icrcCustomTokens?.[ledgerCanisterId]?.alternativeName) && {
			alternativeName: icrcCustomTokens[ledgerCanisterId].alternativeName
		}),
		ledgerCanisterId,
		...metadataToken,
		...rest
	};
};

type IcrcTokenMetadata = TokenMetadata & IcFee;

const mapOptionalToken = (response: IcrcTokenMetadataResponse): IcrcTokenMetadata | undefined =>
	mapTokenMetadata(response);

// eslint-disable-next-line local-rules/prefer-object-params -- This is a sorting function, so the parameters will be provided not as an object but as separate arguments.
export const sortIcTokens = (
	{ name: nameA, position: positionA, exchangeCoinId: exchangeCoinIdA }: IcToken,
	{ name: nameB, position: positionB, exchangeCoinId: exchangeCoinIdB }: IcToken
) =>
	positionA === positionB
		? exchangeCoinIdA === exchangeCoinIdB ||
			isNullish(exchangeCoinIdA) ||
			isNullish(exchangeCoinIdB)
			? nameA.localeCompare(nameB)
			: exchangeCoinIdA.localeCompare(exchangeCoinIdB)
		: positionA - positionB;

export const buildIcrcCustomTokenMetadataPseudoResponse = ({
	icrcCustomTokens,
	ledgerCanisterId
}: {
	ledgerCanisterId: CanisterIdText;
	icrcCustomTokens: Record<LedgerCanisterIdText, IcTokenWithoutIdExtended>;
}): IcrcTokenMetadataResponse | undefined => {
	const token = icrcCustomTokens[ledgerCanisterId];

	if (isNullish(token)) {
		return undefined;
	}

	const { symbol, icon: tokenIcon, name, fee, decimals } = token;

	const icon: [IcrcMetadataResponseEntries.LOGO, IcrcValue] | undefined = nonNullish(tokenIcon)
		? [IcrcMetadataResponseEntries.LOGO, { Text: tokenIcon }]
		: undefined;

	return [
		[IcrcMetadataResponseEntries.SYMBOL, { Text: symbol }],
		[IcrcMetadataResponseEntries.NAME, { Text: name }],
		[IcrcMetadataResponseEntries.FEE, { Nat: fee }],
		[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(decimals) }],
		...(nonNullish(icon) ? [icon] : [])
	];
};

export const isTokenIcp = (token: Partial<IcToken>): token is IcToken => token.standard === 'icp';

export const isTokenIcrc = (token: Partial<IcToken>): token is IcToken => token.standard === 'icrc';

export const isTokenDip20 = (token: Partial<IcToken>): token is IcToken =>
	token.standard === 'dip20';

export const isTokenIc = (token: Partial<IcToken>): token is IcToken =>
	isTokenIcp(token) || isTokenIcrc(token) || isTokenDip20(token);

export const icTokenIcrcCustomToken = (token: Partial<IcrcCustomToken>): token is IcrcCustomToken =>
	isTokenIc(token) && 'enabled' in token;

const isIcCkInterface = (token: IcInterface): token is IcCkInterface =>
	'minterCanisterId' in token && 'twinToken' in token;

// TODO: create tests
export const mapTokenOisyName = (token: IcInterface): IcInterface => ({
	...token,
	...(isIcCkInterface(token) && nonNullish(token.twinToken)
		? {
				oisyName: {
					prefix: 'ck',
					oisyName: token.twinToken.name
				}
			}
		: {})
});

// TODO: create tests
export const mapTokenOisySymbol = (token: IcInterface): IcInterface => ({
	...token,
	...(nonNullish(CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID[token.ledgerCanisterId])
		? {
				oisySymbol: {
					oisySymbol: CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID[token.ledgerCanisterId]
				}
			}
		: {})
});
