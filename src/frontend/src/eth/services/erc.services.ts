import type { Erc1155ContractAddress, Erc1155UriJson } from '$eth/types/erc1155';
import type { Erc721ContractAddress, Erc721UriJson } from '$eth/types/erc721';
import { InvalidMetadataImageUrl, InvalidTokenUri } from '$lib/types/errors';
import type { NftId } from '$lib/types/nft';
import { parseMetadataResourceUrl } from '$lib/utils/nfts.utils';
import { isNullish } from '@dfinity/utils';

const extractImageUrl = ({
	imageUrl,
	contractAddress,
	tokenId
}: {
	imageUrl: string | undefined;
	contractAddress: Erc721ContractAddress['address'] | Erc1155ContractAddress['address'];
	tokenId: NftId;
}): URL | undefined => {
	if (isNullish(imageUrl)) {
		return undefined;
	}

	return parseMetadataResourceUrl({
		url: imageUrl,
		error: new InvalidMetadataImageUrl(tokenId, contractAddress)
	});
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
	const metadata = await response.json();

	if (isNullish(metadata)) {
		return { metadata: undefined, imageUrl: undefined };
	}

	const imageUrl = extractImageUrl({
		imageUrl: metadata.image ?? metadata.image_url,
		contractAddress,
		tokenId
	});

	return { metadata, imageUrl };
};
