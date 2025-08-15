import { NftCollectionSchema } from '$lib/schema/nft.schema';
import type { NftError } from '$lib/types/errors';
import type {
	Nft,
	NftCollection,
	NftCollectionUi,
	NftId,
	NftsByNetwork,
	NonFungibleToken
} from '$lib/types/nft';
import { UrlSchema } from '$lib/validation/url.validation';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

export const getNftsByNetworks = ({
	tokens,
	nfts
}: {
	tokens: NonFungibleToken[];
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
			collection: {
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

export const findNft = ({
	nfts,
	token: { address: tokenAddress, network: tokenNetwork },
	tokenId
}: {
	nfts: Nft[];
	token: NonFungibleToken;
	tokenId: NftId;
}): Nft | undefined =>
	nfts.find(
		({ id, collection: { address, network } }) =>
			address === tokenAddress && network === tokenNetwork && id === tokenId
	);

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

export const parseMetadataResourceUrl = ({ url, error }: { url: string; error: NftError }): URL => {
	const parsedUrl = UrlSchema.safeParse(url);

	if (!parsedUrl.success) {
		throw error;
	}

	const adaptedUrl = adaptMetadataResourceUrl(new URL(parsedUrl.data));

	if (isNullish(adaptedUrl)) {
		throw error;
	}

	return adaptedUrl;
};

export const mapTokenToCollection = (token: NonFungibleToken): NftCollection =>
	NftCollectionSchema.parse({
		address: token.address,
		id: token.id,
		network: token.network,
		standard: token.standard,
		...(notEmptyString(token.symbol) && { symbol: token.symbol }),
		...(notEmptyString(token.name) && { name: token.name })
	});

export const getEnabledNfts = ({
	$nftStore,
	$enabledNonFungibleNetworkTokens
}: {
	$nftStore: Nft[] | undefined;
	$enabledNonFungibleNetworkTokens: NonFungibleToken[];
}): Nft[] =>
	($nftStore ?? []).filter(
		({
			collection: {
				address: nftContractAddress,
				network: { id: nftContractNetworkId }
			}
		}) =>
			$enabledNonFungibleNetworkTokens.some(
				({ address: contractAddress, network: { id: contractNetworkId } }) =>
					contractAddress === nftContractAddress && contractNetworkId === nftContractNetworkId
			)
	);

export const getNftCollectionUi = ({
	$nonFungibleTokens,
	$nftStore
}: {
	$nonFungibleTokens: NonFungibleToken[];
	$nftStore: Nft[] | undefined;
}): NftCollectionUi[] => {
	// key uses exact address + network.id (no lowercasing, matches your original)
	const keyOf = ({ addr, netId }: { addr: string; netId: string | number }) => `${netId}:${addr}`;

	const index = new Map<string, NftCollectionUi>();

	return [...$nonFungibleTokens, ...($nftStore ?? [])].reduce<NftCollectionUi[]>((acc, item) => {
		if ('collection' in item) {
			const k = keyOf({ addr: item.collection.address, netId: String(item.collection.network.id) });
			const entry = index.get(k);
			if (entry) {
				entry.nfts = [...entry.nfts, item];
			} // only attach if the token exists
			return acc;
		}
		const coll = mapTokenToCollection(item);
		const k = keyOf({ addr: coll.address, netId: String(coll.network.id) });
		const entry: NftCollectionUi = { collection: coll, nfts: [] };
		index.set(k, entry);
		acc = [...acc, entry];
		return acc;
	}, []);
};
