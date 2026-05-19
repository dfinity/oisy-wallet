import type { Value } from '$declarations/icrc7/icrc7.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { EnvIcrc7Token } from '$env/types/env-icrc7-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import type { Icrc7Token, Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { NftMetadataWithoutId } from '$lib/types/nft';
import type { Token, TokenMetadata } from '$lib/types/token';
import { mapNftAttributes } from '$lib/utils/nft.utils';
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

const ICRC7_TOKEN_NAME_KEYS = ['icrc7:name', 'icrc7:metadata:name', 'name'];
const ICRC7_TOKEN_DESCRIPTION_KEYS = [
	'icrc7:description',
	'icrc7:metadata:description',
	'description'
];
const ICRC7_TOKEN_IMAGE_KEYS = [
	'icrc7:image',
	'icrc7:metadata:image',
	'icrc7:image_url',
	'icrc7:metadata:image_url',
	'image',
	'image_url'
];
const ICRC7_TOKEN_ATTRIBUTES_KEYS = ['icrc7:attributes', 'icrc7:metadata:attributes', 'attributes'];

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

const valueToString = ({ value }: { value: Value }): string | undefined => {
	if ('Text' in value) {
		return value.Text;
	}

	if ('Nat' in value) {
		return value.Nat.toString();
	}

	if ('Int' in value) {
		return value.Int.toString();
	}

	return undefined;
};

const lookupStringByKeys = ({
	entries,
	keys
}: {
	entries: Array<[string, Value]>;
	keys: string[];
}): string | undefined => {
	const entry = entries.find(([key]) => keys.includes(key));

	return entry === undefined ? undefined : valueToString({ value: entry[1] });
};

const valueToAttributeValue = ({
	value
}: {
	value: Value;
}): string | number | boolean | undefined => valueToString({ value });

const valueToAttributeRecord = ({
	value
}: {
	value: Value;
}): { trait_type: string; value?: string | number | boolean } | undefined => {
	if (!('Map' in value)) {
		return undefined;
	}

	const traitType = lookupStringByKeys({
		entries: value.Map,
		keys: ['trait_type', 'traitType', 'name']
	});

	if (traitType === undefined) {
		return undefined;
	}

	const rawValue = value.Map.find(([key]) => key === 'value')?.[1];

	return {
		trait_type: traitType,
		...(rawValue !== undefined && { value: valueToAttributeValue({ value: rawValue }) })
	};
};

const lookupAttributesByKeys = ({
	entries,
	keys
}: {
	entries: Array<[string, Value]>;
	keys: string[];
}): NftMetadataWithoutId['attributes'] | undefined => {
	const entry = entries.find(([key]) => keys.includes(key));

	if (entry === undefined) {
		return undefined;
	}

	const [, value] = entry;

	if ('Map' in value) {
		return mapNftAttributes(
			Object.fromEntries(
				value.Map.map(([traitType, traitValue]) => [
					traitType,
					valueToAttributeValue({ value: traitValue })
				])
			)
		);
	}

	if ('Array' in value) {
		return mapNftAttributes(
			value.Array.map((attributeValue) => valueToAttributeRecord({ value: attributeValue })).filter(
				(attribute): attribute is { trait_type: string; value?: string | number | boolean } =>
					attribute !== undefined
			)
		);
	}

	return undefined;
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

/**
 * Maps an ICRC-7 `icrc7_token_metadata` response for a single token into the NFT metadata shape
 * consumed by the NFT grid.
 *
 * Real collections are not fully consistent about key names, so this accepts the standard
 * `icrc7:*` keys, the `icrc7:metadata:*` namespace and common unprefixed fallbacks.
 */
export const mapIcrc7TokenMetadata = (
	entries: Array<[string, Value]>
): Omit<NftMetadataWithoutId, 'id'> => {
	const name = lookupStringByKeys({ entries, keys: ICRC7_TOKEN_NAME_KEYS });
	const description = lookupStringByKeys({ entries, keys: ICRC7_TOKEN_DESCRIPTION_KEYS });
	const imageUrl = lookupStringByKeys({ entries, keys: ICRC7_TOKEN_IMAGE_KEYS });
	const attributes = lookupAttributesByKeys({ entries, keys: ICRC7_TOKEN_ATTRIBUTES_KEYS });

	return {
		...(name !== undefined && { name }),
		...(description !== undefined && { description }),
		...(imageUrl !== undefined && { imageUrl }),
		...(attributes !== undefined && { attributes })
	};
};
