import type { Erc1155ContractAddress, Erc1155UriJson } from '$eth/types/erc1155';
import type { Erc721ContractAddress, Erc721UriJson } from '$eth/types/erc721';
import { InvalidMetadataImageUrl, InvalidTokenUri } from '$lib/types/errors';
import type { NftId } from '$lib/types/nft';
import { parseMetadataResourceUrl } from '$lib/utils/nfts.utils';
import { isNullish, notEmptyString } from '@dfinity/utils';

// `image_data` carries the media inline as raw SVG markup instead of by
// reference, so it has to be wrapped into a data URI to become displayable.
const toImageDataUrl = (imageData: string): string =>
	`data:image/svg+xml;utf8,${encodeURIComponent(imageData)}`;

const extractImageUrl = ({
	metadata: { image, image_url: imageUrl, image_data: imageData },
	metadataUrl,
	contractAddress,
	tokenId
}: {
	metadata: Erc721UriJson | Erc1155UriJson;
	metadataUrl: URL;
	contractAddress: Erc721ContractAddress['address'] | Erc1155ContractAddress['address'];
	tokenId: NftId;
}): URL | undefined => {
	const source =
		[image, imageUrl].find(notEmptyString) ??
		(notEmptyString(imageData) ? toImageDataUrl(imageData) : undefined);

	if (isNullish(source)) {
		return;
	}

	try {
		return parseMetadataResourceUrl({
			url: source,
			base: metadataUrl,
			error: new InvalidMetadataImageUrl(tokenId, contractAddress)
		});
	} catch (_: unknown) {
		// An unusable image reference must not discard the rest of the document:
		// name, description and attributes remain worth displaying.
	}
};

export const fetchMetadataFromUri = async ({
	metadataUrl: url,
	contractAddress,
	tokenId
}: {
	metadataUrl: string | undefined;
	contractAddress: Erc721ContractAddress['address'] | Erc1155ContractAddress['address'];
	tokenId: NftId;
}): Promise<{
	metadata: Erc721UriJson | Erc1155UriJson | undefined;
	imageUrl: URL | undefined;
}> => {
	if (isNullish(url)) {
		return { metadata: undefined, imageUrl: undefined };
	}

	const metadataUrl = parseMetadataResourceUrl({
		url,
		error: new InvalidTokenUri(tokenId, contractAddress)
	});

	const response = await fetch(metadataUrl);

	// A gateway that 404s still resolves the promise, and parsing its error page
	// as JSON would surface as an opaque syntax error instead of a token URI one.
	if (!response.ok) {
		throw new InvalidTokenUri(tokenId, contractAddress);
	}

	const metadata: Erc721UriJson | Erc1155UriJson | undefined = await response.json();

	if (isNullish(metadata)) {
		return { metadata: undefined, imageUrl: undefined };
	}

	const imageUrl = extractImageUrl({ metadata, metadataUrl, contractAddress, tokenId });

	return { metadata, imageUrl };
};
