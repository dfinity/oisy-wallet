import type { Value } from '$declarations/icrc7/icrc7.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { EnvIcrc7Token } from '$env/types/env-icrc7-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import type { Icrc7Token, Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { NftMetadataWithoutId } from '$lib/types/nft';
import type { TokenMetadata } from '$lib/types/token';
import { mapNftAttributes } from '$lib/utils/nft.utils';
import { toggleableTokenGuard } from '$lib/utils/token-guards.utils';
import { isNullish, nonNullish, uint8ArrayToBase64 } from '@dfinity/utils';

export const isTokenIcrc7 = (token: Partial<IcToken>): token is Icrc7Token =>
	token.standard?.code === 'icrc7';

export const isTokenIcrc7CustomToken = toggleableTokenGuard<Icrc7CustomToken>(isTokenIcrc7);

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

const ICRC7_TOKEN_NAME_KEYS = [
	'icrc7:name',
	'icrc7:title',
	'icrc7:metadata:name',
	'icrc7:metadata:title',
	'name',
	'title'
];
const ICRC7_TOKEN_DESCRIPTION_KEYS = [
	'icrc7:description',
	'icrc7:metadata:description',
	'description'
];
const ICRC7_TOKEN_IMAGE_KEYS = [
	'icrc7:image',
	'icrc7:imageUrl',
	'icrc7:metadata:image',
	'icrc7:metadata:imageUrl',
	'icrc7:image_url',
	'icrc7:metadata:image_url',
	'image',
	'imageUrl',
	'image_url'
];
const ICRC7_TOKEN_THUMBNAIL_KEYS = [
	'icrc7:thumbnail',
	'icrc7:thumbnailUrl',
	'icrc7:metadata:thumbnail',
	'icrc7:metadata:thumbnailUrl',
	'icrc7:thumbnail_url',
	'icrc7:metadata:thumbnail_url',
	'thumbnail',
	'thumbnailUrl',
	'thumbnail_url'
];
const ICRC7_TOKEN_METADATA_URI_KEYS = [
	'icrc7:uri',
	'icrc7:metadata:uri',
	'uri',
	'metadataUri',
	'metadata_uri'
];
const ICRC7_TOKEN_ATTRIBUTES_KEYS = ['icrc7:attributes', 'icrc7:metadata:attributes', 'attributes'];
const ICRC7_TOKEN_RESERVED_ATTRIBUTE_KEYS = new Set([
	...ICRC7_TOKEN_NAME_KEYS,
	...ICRC7_TOKEN_DESCRIPTION_KEYS,
	...ICRC7_TOKEN_IMAGE_KEYS,
	...ICRC7_TOKEN_THUMBNAIL_KEYS,
	...ICRC7_TOKEN_METADATA_URI_KEYS,
	...ICRC7_TOKEN_ATTRIBUTES_KEYS
]);

const lookupText = ({
	entries,
	key
}: {
	entries: Array<[string, Value]>;
	key: string;
}): string | undefined => {
	const entry = entries.find(([k]) => k === key);

	if (isNullish(entry)) {
		return;
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
};

const blobImageMimeType = (value: Uint8Array): string | undefined => {
	const [first, second, third, fourth, ...rest] = value;

	if (first === 0xff && second === 0xd8 && third === 0xff) {
		return 'image/jpeg';
	}

	if (
		first === 0x89 &&
		second === 0x50 &&
		third === 0x4e &&
		fourth === 0x47 &&
		rest[0] === 0x0d &&
		rest[1] === 0x0a &&
		rest[2] === 0x1a &&
		rest[3] === 0x0a
	) {
		return 'image/png';
	}

	if (
		first === 0x47 &&
		second === 0x49 &&
		third === 0x46 &&
		fourth === 0x38 &&
		(rest[0] === 0x37 || rest[0] === 0x39) &&
		rest[1] === 0x61
	) {
		return 'image/gif';
	}

	if (
		first === 0x52 &&
		second === 0x49 &&
		third === 0x46 &&
		fourth === 0x46 &&
		rest[4] === 0x57 &&
		rest[5] === 0x45 &&
		rest[6] === 0x42 &&
		rest[7] === 0x50
	) {
		return 'image/webp';
	}

	const text = new TextDecoder().decode(value.slice(0, 256)).trimStart().toLowerCase();
	const normalizedText = text
		.replace(/^(?:<\?xml[\s\S]*?\?>\s*|<!doctype\s+svg[^>]*>\s*|<!--[\s\S]*?-->\s*)*/u, '')
		.trimStart();

	if (normalizedText.startsWith('<svg')) {
		return 'image/svg+xml';
	}
};

const blobToImageDataUrl = ({ value }: { value: Uint8Array }): string | undefined => {
	const mimeType = blobImageMimeType(value);

	if (isNullish(mimeType)) {
		return;
	}

	return `data:${mimeType};base64,${uint8ArrayToBase64(value)}`;
};

const valueToImageUrl = ({ value }: { value: Value }): string | undefined => {
	if ('Blob' in value) {
		return blobToImageDataUrl({ value: value.Blob });
	}

	return valueToString({ value });
};

const lookupStringByKeys = ({
	entries,
	keys
}: {
	entries: Array<[string, Value]>;
	keys: string[];
}): string | undefined => {
	const entry = entries.find(([key]) => keys.includes(key));

	if (isNullish(entry)) {
		return;
	}

	return valueToString({ value: entry[1] });
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
		return;
	}

	const traitType = lookupStringByKeys({
		entries: value.Map,
		keys: ['trait_type', 'traitType', 'name']
	});

	if (isNullish(traitType)) {
		return;
	}

	const rawValue = value.Map.find(([key]) => key === 'value')?.[1];

	return {
		trait_type: traitType,
		...(nonNullish(rawValue) && { value: valueToAttributeValue({ value: rawValue }) })
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

	if (isNullish(entry)) {
		return;
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
					nonNullish(attribute)
			)
		);
	}
};

const tokenMetadataKeyToTraitType = ({ key }: { key: string }): string =>
	key.replace(/^icrc7:metadata:/u, '').replace(/^icrc7:/u, '');

const lookupAdditionalScalarAttributes = ({
	entries
}: {
	entries: Array<[string, Value]>;
}): NftMetadataWithoutId['attributes'] | undefined => {
	const attributes = mapNftAttributes(
		entries.flatMap(([key, value]) => {
			if (ICRC7_TOKEN_RESERVED_ATTRIBUTE_KEYS.has(key)) {
				return [];
			}

			const attributeValue = valueToAttributeValue({ value });

			return nonNullish(attributeValue)
				? [{ trait_type: tokenMetadataKeyToTraitType({ key }), value: attributeValue }]
				: [];
		})
	);

	return attributes.length > 0 ? attributes : undefined;
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

	if (isNullish(name) || isNullish(symbol)) {
		return;
	}

	const description = lookupText({ entries, key: ICRC7_DESCRIPTION_KEY });
	const icon = lookupText({ entries, key: ICRC7_LOGO_KEY });

	return {
		name,
		symbol,
		...(nonNullish(description) && { description }),
		...(nonNullish(icon) && { icon })
	};
};

/**
 * Maps an ICRC-7 `icrc7_token_metadata` response for a single token into the NFT metadata shape
 * consumed by the NFT grid.
 *
 * Real collections are not fully consistent about key names, so this accepts the standard
 * `icrc7:*` keys, the `icrc7:metadata:*` namespace and common unprefixed fallbacks.
 */
export const mapIcrc7TokenMetadata = (entries: Array<[string, Value]>): NftMetadataWithoutId => {
	const name = lookupStringByKeys({ entries, keys: ICRC7_TOKEN_NAME_KEYS });
	const description = lookupStringByKeys({ entries, keys: ICRC7_TOKEN_DESCRIPTION_KEYS });
	const imageEntry = entries.find(([key]) => ICRC7_TOKEN_IMAGE_KEYS.includes(key));
	const thumbnailEntry = entries.find(([key]) => ICRC7_TOKEN_THUMBNAIL_KEYS.includes(key));
	const imageUrl = nonNullish(imageEntry) ? valueToImageUrl({ value: imageEntry[1] }) : undefined;
	const thumbnailUrl = nonNullish(thumbnailEntry)
		? valueToImageUrl({ value: thumbnailEntry[1] })
		: undefined;
	const attributes = lookupAttributesByKeys({ entries, keys: ICRC7_TOKEN_ATTRIBUTES_KEYS });
	const scalarAttributes = lookupAdditionalScalarAttributes({ entries });
	const mergedAttributes =
		nonNullish(attributes) || nonNullish(scalarAttributes)
			? [...(attributes ?? []), ...(scalarAttributes ?? [])]
			: undefined;

	return {
		...(nonNullish(name) && { name }),
		...(nonNullish(description) && { description }),
		...(nonNullish(imageUrl) && { imageUrl }),
		...(nonNullish(thumbnailUrl) && { thumbnailUrl }),
		...(nonNullish(mergedAttributes) && { attributes: mergedAttributes })
	};
};
