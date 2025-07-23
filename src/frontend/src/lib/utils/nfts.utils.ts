import type { Erc721Token } from '$eth/types/erc721';
import { NftError } from '$lib/types/errors';
import type { Nft, NftsByNetwork } from '$lib/types/nft';
import { UrlSchema } from '$lib/validation/url.validation';
import { isNullish, nonNullish } from '@dfinity/utils';

export const getNftsByNetworks = ({
	tokens,
	nfts
}: {
	tokens: Erc721Token[];
	nfts: Nft[];
}): NftsByNetwork => {
	const nftsByToken: NftsByNetwork = {};

	tokens.forEach(({ address, network: { id: networkId } }) => {
		if (isNullish(nftsByToken[networkId])) {
			nftsByToken[networkId] = {};
		}
		nftsByToken[networkId][address.toLowerCase()] = [];
	});

	nfts.forEach((nft) => {
		const {
			contract: {
				network: { id: networkId },
				address
			}
		} = nft;
		const normalizedAddress = address.toLowerCase();

		if (
			nonNullish(nftsByToken[networkId]) &&
			nonNullish(nftsByToken[networkId][normalizedAddress])
		) {
			nftsByToken[networkId][normalizedAddress].push(nft);
		}
	});

	return nftsByToken;
};

const adaptMetadataResourceUrl = (url: URL): URL | undefined => {
	const IPFS_PROTOCOL = 'ipfs:';
	const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

	if (url.protocol !== IPFS_PROTOCOL) {
		return url;
	}

	const newUrl = url.href.replace(`${IPFS_PROTOCOL}//`, IPFS_GATEWAY);

	const parsedNewUrl = UrlSchema.safeParse(newUrl);

	if (!parsedNewUrl.success) {
		return;
	}

	return new URL(parsedNewUrl.data);
};

export const parseMetadataResourceUrl = ({
	url,
	error
}: {
	url: string;
	error: NftError;
}): URL | undefined => {
	const parsedUrl = UrlSchema.safeParse(url);

	if (!parsedUrl.success) {
		throw error;
	}

	return adaptMetadataResourceUrl(new URL(parsedUrl.data));
};
