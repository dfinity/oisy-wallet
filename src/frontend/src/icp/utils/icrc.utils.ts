import { ICP_NETWORK, ICP_PSEUDO_TESTNET_NETWORK } from '$env/networks/networks.icp.env';
import {
	BITCAT_LEDGER_CANISTER_ID,
	FORSETISCN_LEDGER_CANISTER_ID,
	GHOSTNODE_LEDGER_CANISTER_ID,
	ICONFUCIUS_LEDGER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type {
	IcCkInterface,
	IcCkMetadata,
	IcFee,
	IcInterface,
	IcToken,
	IcTokenWithoutId
} from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcTestnet } from '$icp/utils/ic-ledger.utils';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { TokenCategory, TokenMetadata } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { UrlSchema } from '$lib/validation/url.validation';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { mapTokenMetadata, type IcrcTokenMetadataResponse } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

export type IcrcLoadData = Omit<IcInterface, 'explorerUrl'> &
	Partial<IcCkMetadata> & {
		metadata: IcrcTokenMetadataResponse;
		category: TokenCategory;
		icrcCustomTokens?: Record<LedgerCanisterIdText, IcTokenWithoutId>;
	};

export const CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID: Record<LedgerCanisterIdText, string> = {
	[BITCAT_LEDGER_CANISTER_ID]: 'BITCAT',
	[FORSETISCN_LEDGER_CANISTER_ID]: 'FORSETISCN',
	[GHOSTNODE_LEDGER_CANISTER_ID]: 'GHOSTNODE',
	[ICONFUCIUS_LEDGER_CANISTER_ID]: 'ICONFUCIUS'
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
}: IcrcLoadData): IcToken | undefined => {
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

	const customTokenSymbol = icrcCustomTokens?.[ledgerCanisterId];

	const twinTokenTags = rest.twinToken?.tags;

	const mintingAccount =
		rest.mintingAccount ??
		(nonNullish(rest.minterCanisterId)
			? getIcrcAccount(Principal.fromText(rest.minterCanisterId))
			: undefined);

	return {
		id: parseTokenId(symbol),
		network: mapIcNetwork(ledgerCanisterId),
		standard: customTokenSymbol?.standard ?? { code: 'icrc' },
		symbol,
		...(notEmptyString(icon) && { icon }),
		...(nonNullish(customTokenSymbol?.explorerUrl) && {
			explorerUrl: customTokenSymbol.explorerUrl
		}),
		...(nonNullish(customTokenSymbol?.alternativeName) && {
			alternativeName: customTokenSymbol.alternativeName
		}),
		...(nonNullish(customTokenSymbol?.deprecated) && {
			deprecated: customTokenSymbol.deprecated
		}),
		tags: customTokenSymbol?.tags ?? twinTokenTags ?? DEFAULT_TOKEN_TAGS,
		...(nonNullish(customTokenSymbol?.groupData) && { groupData: customTokenSymbol.groupData }),
		ledgerCanisterId,
		...metadataToken,
		...rest,
		// Backfill the index canister id from the curated environment token when the
		// import didn't provide one (e.g. a user adds a known ICRC token by ledger id
		// only). A user-supplied index id always wins.
		...(isNullish(rest.indexCanisterId) &&
			nonNullish(customTokenSymbol?.indexCanisterId) && {
				indexCanisterId: customTokenSymbol.indexCanisterId
			}),
		...(nonNullish(mintingAccount) && { mintingAccount })
	};
};

type IcrcTokenMetadata = TokenMetadata & IcFee;

const mapOptionalToken = (response: IcrcTokenMetadataResponse): IcrcTokenMetadata | undefined =>
	mapTokenMetadata(response);

// eslint-disable-next-line local-rules/prefer-object-params -- This is a sorting function, so the parameters will be provided not as an object but as separate arguments.
export const sortIcTokens = (
	{ name: nameA, exchangeCoinId: exchangeCoinIdA }: IcToken,
	{ name: nameB, exchangeCoinId: exchangeCoinIdB }: IcToken
) =>
	exchangeCoinIdA === exchangeCoinIdB || isNullish(exchangeCoinIdA) || isNullish(exchangeCoinIdB)
		? nameA.localeCompare(nameB)
		: exchangeCoinIdA.localeCompare(exchangeCoinIdB);

export const isTokenIcp = (token: Partial<IcToken>): token is IcToken =>
	token.standard?.code === 'icp';

export const isTokenIcrc = (token: Partial<IcToken>): token is IcToken =>
	token.standard?.code === 'icrc';

export const isTokenDip20 = (token: Partial<IcToken>): token is IcToken =>
	token.standard?.code === 'dip20';

export const isTokenIc = (token: Partial<IcToken>): token is IcToken =>
	isTokenIcp(token) || isTokenIcrc(token) || isTokenDip20(token);

export const isTokenIcrcCustomToken = (token: Partial<IcrcCustomToken>): token is IcrcCustomToken =>
	isTokenIc(token) && isTokenToggleable(token);

const isIcCkInterface = (token: IcInterface): token is IcCkInterface =>
	'minterCanisterId' in token && 'twinToken' in token;

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
