import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { NftCollection, NftId } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenErc1155 = (token: Token): token is Erc1155Token =>
	token.standard.code === 'erc1155';

export const isCollectionErc1155 = (collection: NftCollection) =>
	collection.standard.code === 'erc1155';

export const isTokenErc1155CustomToken = (token: Token): token is Erc1155CustomToken =>
	isTokenErc1155(token) && isTokenToggleable(token);

const ERC1155_URI_ID_PLACEHOLDER = '{id}';

// https://eips.ethereum.org/EIPS/eip-1155#metadata
const ERC1155_URI_ID_HEX_LENGTH = 64;

const toUriTokenId = (tokenId: NftId): string | undefined => {
	try {
		return BigInt(tokenId).toString(16).padStart(ERC1155_URI_ID_HEX_LENGTH, '0');
	} catch (_: unknown) {
		// A token id that is not a number cannot follow the EIP-1155 rule; the caller
		// falls back to the raw id rather than dropping the collection's media.
	}
};

/**
 * Applies the EIP-1155 `{id}` substitution rule to a collection metadata URI.
 *
 * The standard mandates the id to be lowercase hexadecimal, zero-padded to 64
 * characters and without the `0x` prefix — a decimal id resolves to a path that
 * does not exist on the collection's metadata host.
 */
export const replaceErc1155UriTokenId = ({
	uri,
	tokenId
}: {
	uri: string;
	tokenId: NftId;
}): string => {
	if (!uri.includes(ERC1155_URI_ID_PLACEHOLDER)) {
		return uri;
	}

	return uri.replaceAll(ERC1155_URI_ID_PLACEHOLDER, toUriTokenId(tokenId) ?? tokenId.toString());
};
