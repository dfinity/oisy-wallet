import type { Value } from '$declarations/icrc7/icrc7.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { EnvIcrc7Token } from '$env/types/env-icrc7-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import type { Icrc7Token, Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { Token, TokenMetadata } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenIcrc7 = (token: Partial<IcToken>): token is Icrc7Token =>
	token.standard?.code === 'icrc7';

export const isTokenIcrc7CustomToken = (token: Token): token is Icrc7CustomToken =>
	isTokenIcrc7(token) && isTokenToggleable(token);

export const mapIcrc7Token = ({
	canisterId,
	metadata: { name, symbol }
}: EnvIcrc7Token): Icrc7TokenWithoutId => ({
	canisterId,
	network: ICP_NETWORK,
	name,
	symbol,
	// ICRC-7 collections do not have a meaningful `decimals` (NFTs); kept at 0 to satisfy
	// the shared `TokenSchema` shape — same convention as `mapIcPunksToken` / `mapDip721Token`.
	decimals: 0,
	standard: {
		code: 'icrc7'
	},
	category: 'custom',
	tags: DEFAULT_TOKEN_TAGS
});

// Standard collection-level metadata keys defined in ICRC-7.
// Reference: https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md#icrc7_collection_metadata
const ICRC7_NAME_KEY = 'icrc7:name';
const ICRC7_SYMBOL_KEY = 'icrc7:symbol';
const ICRC7_DESCRIPTION_KEY = 'icrc7:description';
const ICRC7_LOGO_KEY = 'icrc7:logo';

const lookupText = ({
	entries,
	key
}: {
	entries: Array<[string, Value]>;
	key: string;
}): string | undefined => {
	const entry = entries.find(([k]) => k === key);

	if (entry === undefined) {
		return undefined;
	}

	const [, value] = entry;

	return 'Text' in value ? value.Text : undefined;
};

/**
 * Maps an ICRC-7 `icrc7_collection_metadata` response into a {@link TokenMetadata}-shaped object
 * (without `decimals`, which is not meaningful for NFT collections).
 *
 * Only the four standard collection keys (`icrc7:name`, `icrc7:symbol`, `icrc7:description`,
 * `icrc7:logo`) are read. Non-`Text` values and missing keys produce `undefined`.
 *
 * `name` and `symbol` are required by ICRC-7; if either is missing, the function returns
 * `undefined`.
 */
export const mapIcrc7CollectionMetadata = (
	entries: Array<[string, Value]>
): Omit<TokenMetadata, 'decimals'> | undefined => {
	const name = lookupText({ entries, key: ICRC7_NAME_KEY });
	const symbol = lookupText({ entries, key: ICRC7_SYMBOL_KEY });

	if (name === undefined || symbol === undefined) {
		return undefined;
	}

	const description = lookupText({ entries, key: ICRC7_DESCRIPTION_KEY });
	const icon = lookupText({ entries, key: ICRC7_LOGO_KEY });

	return {
		name,
		symbol,
		...(description !== undefined && { description }),
		...(icon !== undefined && { icon })
	};
};
