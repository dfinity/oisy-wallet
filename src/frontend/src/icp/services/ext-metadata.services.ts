import type { TokenIdentifier } from '$declarations/ext_v2_token/ext_v2_token.did';
import { metadata as metadataApi } from '$icp/api/ext-v2-token.api';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import type { NftMetadataWithoutId } from '$lib/types/nft';
import { isNullish, type QueryParams } from '@dfinity/utils';

const fromJson = (metadata: string): NftMetadataWithoutId | undefined => {
	try {
		const jsonMetadata = JSON.parse(metadata);

		const name = 'name' in jsonMetadata ? jsonMetadata.name : undefined;
		const imageUrl = 'url' in jsonMetadata ? jsonMetadata.url : undefined;
		const thumbnailUrl = 'thumbnail' in jsonMetadata ? jsonMetadata.thumbnail : undefined;
		const description = 'description' in jsonMetadata ? jsonMetadata.description : undefined;
		const attributes = 'attributes' in jsonMetadata ? jsonMetadata.attributes : undefined;

		return {
			name,
			imageUrl,
			thumbnailUrl,
			description,
			attributes
		};
	} catch (_: unknown) {
		// Metadata is not valid JSON
	}
};

const fromBlob = (metadata: Uint8Array): NftMetadataWithoutId | undefined => {
	try {
		const decodedMetadata = new TextDecoder().decode(metadata);

		return fromJson(decodedMetadata);
	} catch (_: unknown) {
		// Metadata is not valid UTF-8
	}
};

export const getExtMetadata = async (
	params: CanisterApiFunctionParamsWithCanisterId<
		{ tokenIdentifier: TokenIdentifier } & QueryParams
	>
): Promise<NftMetadataWithoutId | undefined> => {
	const response = await metadataApi(params);

	if (isNullish(response)) {
		return;
	}

	if (!('nonfungible' in response)) {
		return;
	}

	const { nonfungible } = response;

	// EXT V2

	// EXT Legacy
	const { metadata: nullableMetadata } = nonfungible;

	// We cannot use `fromNullable` here since it is a nullable of different types
	const [metadata] = nullableMetadata;

	if (isNullish(metadata)) {
		return;
	}

	if ('blob' in metadata) {
		return fromBlob(metadata.blob);
	}

	if ('json' in metadata) {
		return fromJson(metadata.json);
	}

	if ('data' in metadata) {
		// TODO: Map the metadata for this case when we have a practical example
		return;
	}

	// EXT legacy
	return fromBlob(metadata);
};
