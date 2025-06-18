import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	GHOSTNODE_LEDGER_CANISTER_ID,
	ICONFUCIUS_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcCkInterface, IcFee, IcInterface, IcToken } from '$icp/types/ic-token';
import type {
	IcTokenExtended,
	IcTokenWithoutIdExtended,
	IcrcCustomToken
} from '$icp/types/icrc-custom-token';
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
	[GHOSTNODE_LEDGER_CANISTER_ID]: 'GHOSTNODE',
	[ICONFUCIUS_LEDGER_CANISTER_ID]: 'ICONFUCIUS'
};

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
		network: ICP_NETWORK,
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
