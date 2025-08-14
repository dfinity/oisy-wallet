import { NftCollectionSchema } from '$lib/schema/nft.schema';
import type { NftListSortingType } from '$lib/stores/nft-list.store';
import type { NftError } from '$lib/types/errors';
import type {
	Nft,
	NftId,
	NftCollection,
	NftCollectionUi,
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
}): NftCollectionUi[] =>
	$nonFungibleTokens.map(mapTokenToCollection).map((coll) => ({
		collection: coll,
		nfts: ($nftStore ?? []).filter(
			(nft) =>
				nft.collection.address === coll.address && nft.collection.network.id === coll.network.id
		)
	}));

const collator = new Intl.Collator(undefined, {
	sensitivity: 'base', // case-insensitive
	numeric: true // natural sort for names with numbers
});

const cmpByCollectionName =
	(dir: number) =>
	(a: Nft | NftCollectionUi, b: Nft | NftCollectionUi): number => {
		const an = a.collection?.name ?? '';
		const bn = b.collection?.name ?? '';
		return collator.compare(an, bn) * dir;
	};

const cmpByDate =
	(dir: number) =>
	(a: Nft | NftCollectionUi, b: Nft | NftCollectionUi): number => {
		// todo
		return collator.compare('', '') * dir;
	};

export const filterSortNfts = ({
	nfts,
	filter,
	sort
}: {
	nfts: Nft[];
	filter?: string;
	sort?: NftListSortingType;
}): Nft[] => {
	if (nonNullish(filter)) {
		nfts = nfts.filter(
			(nft) => (nft?.collection?.name?.toLowerCase() ?? '').indexOf(filter.toLowerCase()) >= 0
		);
	}

	if (nonNullish(sort)) {
		const dir = sort.order === 'asc' ? 1 : -1;
		const comparator = sort.type === 'collection-name' ? cmpByCollectionName(dir) : cmpByDate(dir);

		nfts = [...nfts].sort(comparator);
	}

	return nfts;
};

export const filterSortNftCollections = ({
	nftCollections,
	filter,
	sort
}: {
	nftCollections: NftCollectionUi[];
	filter?: string;
	sort?: NftListSortingType;
}): NftCollectionUi[] => {
	if (nonNullish(filter)) {
		nftCollections = [...nftCollections].filter(
			(coll) => (coll?.collection?.name?.toLowerCase() ?? '').indexOf(filter.toLowerCase()) >= 0
		);
	}

	if (nonNullish(sort)) {
		const dir = sort.order === 'asc' ? 1 : -1;
		const comparator = sort.type === 'collection-name' ? cmpByCollectionName(dir) : cmpByDate(dir);

		nftCollections = [...nftCollections].sort(comparator);
	}

	return nftCollections;
};
