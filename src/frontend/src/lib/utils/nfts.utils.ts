import type { EthAddress } from '$eth/types/address';
import { NFT_MAX_FILESIZE_LIMIT } from '$lib/constants/app.constants';
import { MediaType } from '$lib/enums/media-type';
import { NftCollectionSchema, NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type { NftSortingType } from '$lib/stores/settings.store';
import type { NftError } from '$lib/types/errors';
import type { NetworkId, OptionNetworkId } from '$lib/types/network';
import type { Nft, NftCollection, NftCollectionUi, NftId, NonFungibleToken } from '$lib/types/nft';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { getNftIdentifier } from '$lib/utils/nft.utils';
import { UrlSchema } from '$lib/validation/url.validation';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { SvelteMap } from 'svelte/reactivity';

export const findNft = ({
	nfts,
	token,
	tokenId
}: {
	nfts: Nft[];
	token: NonFungibleToken;
	tokenId: NftId;
}): Nft | undefined =>
	nfts.find(
		({ id, collection: { address, network } }) =>
			address === getNftIdentifier(token) && network.id === token.network.id && id === tokenId
	);

export const findNftsByToken = ({ nfts, token }: { nfts: Nft[]; token: NonFungibleToken }): Nft[] =>
	nfts.filter((nft) =>
		areAddressesEqual({
			address1: nft.collection.address,
			address2: getNftIdentifier(token),
			networkId: token.network.id
		})
	);

export const findNftsByNetwork = ({
	nfts,
	networkId
}: {
	nfts: Nft[];
	networkId: OptionNetworkId;
}): Nft[] =>
	nonNullish(networkId)
		? nfts.filter((nft) => nft.collection.network.id === networkId)
		: nfts.filter((nft) => nft.collection.network.env !== 'testnet');

export const findNewNftIds = ({
	nfts,
	token,
	inventory
}: {
	nfts: Nft[];
	token: NonFungibleToken;
	inventory: NftId[];
}): NftId[] => inventory.filter((tokenId) => isNullish(findNft({ nfts, token, tokenId })));

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
		address: getNftIdentifier(token),
		id: token.id,
		network: token.network,
		standard: token.standard,
		section: token.section,
		...(notEmptyString(token.symbol) && { symbol: token.symbol }),
		...(notEmptyString(token.name) && { name: token.name }),
		...(notEmptyString(token.description) && { description: token.description }),
		...(nonNullish(token.allowExternalContentSource) && {
			allowExternalContentSource: token.allowExternalContentSource
		})
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
				(token) =>
					getNftIdentifier(token) === nftContractAddress &&
					token.network.id === nftContractNetworkId
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
			if (nonNullish(entry)) {
				entry.nfts = [...entry.nfts, item];
				const newTimestamp = item.acquiredAt?.getTime() ?? 0;
				const currentMax = entry.collection.newestAcquiredAt?.getTime() ?? 0;
				if (newTimestamp > currentMax) {
					entry.collection.newestAcquiredAt = new Date(newTimestamp);
				}
			} // only attach if the token exists
			return acc;
		}
		const coll = mapTokenToCollection(item);
		const k = keyOf({ addr: coll.address, netId: String(coll.network.id) });
		const entry: NftCollectionUi = {
			collection: { ...coll, newestAcquiredAt: new Date(0) },
			nfts: []
		};
		index.set(k, entry);
		acc = [...acc, entry];
		return acc;
	}, []);
};

const collator = new Intl.Collator(new Intl.Locale(navigator.language), {
	sensitivity: 'base', // case-insensitive
	numeric: true // natural sort for names with numbers
});

const cmpByCollectionName =
	(dir: number) =>
	({ a, b }: { a: Nft | NftCollectionUi; b: Nft | NftCollectionUi }): number => {
		const an = a.collection?.name ?? '';
		const bn = b.collection?.name ?? '';
		return collator.compare(an, bn) * dir;
	};

const cmpByAcquiredDate =
	(dir: number) =>
	({ a, b }: { a: Nft | NftCollectionUi; b: Nft | NftCollectionUi }): number => {
		const getNewestAcquiredAt = (item: Nft | NftCollectionUi): number => {
			if (isNft(item)) {
				return item.acquiredAt?.getTime() ?? 0;
			}
			if (isCollectionUi(item)) {
				return item.collection.newestAcquiredAt?.getTime() ?? 0;
			}
			return 0;
		};

		const an = getNewestAcquiredAt(a);
		const bn = getNewestAcquiredAt(b);

		return (an - bn) * dir;
	};

// Overloads (so TS keeps the exact array element type on return)
interface NftBaseFilterAndSortParams<T> {
	items: T[];
	filter?: string;
	sort?: NftSortingType;
}

interface NftFilterAndSortParams extends NftBaseFilterAndSortParams<Nft> {
	items: Nft[];
}

interface NftCollectionFilterAndSortParams extends NftBaseFilterAndSortParams<NftCollectionUi> {
	items: NftCollectionUi[];
}

interface FilterSortByCollection {
	(params: NftFilterAndSortParams): Nft[];
	(params: NftCollectionFilterAndSortParams): NftCollectionUi[];
}

const isCollectionUi = (item: Nft | NftCollectionUi): item is NftCollectionUi =>
	'nfts' in item && 'collection' in item;
const isNft = (item: Nft | NftCollectionUi): item is Nft =>
	'collection' in item && !('nfts' in item);

const matchesFilter = ({
	item,
	filter
}: {
	item: Nft | NftCollectionUi;
	filter: string;
}): boolean => {
	const lower = filter.toLowerCase();

	if (isCollectionUi(item)) {
		// search by collection name
		const collectionName = item.collection?.name?.toLowerCase() ?? '';
		if (collectionName.includes(lower)) {
			return true;
		}
		// search by collections nfts name or id
		return (item.nfts ?? []).some(
			(nft) =>
				(nft.name?.toLowerCase().includes(lower) ?? false) ||
				(String(nft.id)?.toLowerCase().includes(lower) ?? false)
		);
	}

	// search nfts by id, name or collection name
	if (isNft(item)) {
		return (
			(String(item.id)?.toLowerCase().includes(lower) ?? false) ||
			(item.name?.toLowerCase().includes(lower) ?? false) ||
			(item.collection?.name?.toLowerCase().includes(lower) ?? false)
		);
	}

	return false;
};

// Single implementation (T is Nft or NftCollectionUi)
export const filterSortByCollection: FilterSortByCollection = <T extends Nft | NftCollectionUi>({
	items,
	filter,
	sort
}: NftBaseFilterAndSortParams<T>): T[] => {
	let result = items;

	if (nonNullish(filter)) {
		result = result.filter((item) => matchesFilter({ item, filter }));
	}

	if (nonNullish(sort)) {
		const dir = sort.order === 'asc' ? 1 : -1;

		if (sort.type === 'collection-name') {
			result = [...result].sort((a, b) => cmpByCollectionName(dir)({ a, b }));
		} else if (sort.type === 'date') {
			result = [...result].sort((a, b) => cmpByAcquiredDate(dir)({ a, b }));
		} else {
			// extendable, for now we return a copy of the list
			result = [...result];
		}
	}

	return result;
};

export const findNonFungibleToken = ({
	tokens,
	address,
	networkId
}: {
	tokens: NonFungibleToken[];
	address: EthAddress;
	networkId: NetworkId;
}): NonFungibleToken | undefined =>
	tokens.find((token) => getNftIdentifier(token) === address && token.network.id === networkId);

export const getMediaType = (type: string): MediaType | undefined => {
	if (type.startsWith('image/') || type.startsWith('.gif')) {
		return MediaType.Img;
	}

	if (type.startsWith('video/')) {
		return MediaType.Video;
	}
};

export const getMediaStatus = async (mediaUrl?: string): Promise<NftMediaStatusEnum> => {
	if (isNullish(mediaUrl)) {
		return NftMediaStatusEnum.INVALID_DATA;
	}

	try {
		const url = adaptMetadataResourceUrl(new URL(mediaUrl));

		if (isNullish(url)) {
			return NftMediaStatusEnum.INVALID_DATA;
		}

		const response = await fetch(url.href, { method: 'HEAD' });

		const type = response.headers.get('Content-Type');
		const size = response.headers.get('Content-Length');

		if (isNullish(type) || isNullish(size)) {
			// Not all servers return the Content-Type and Content-Length headers,
			// so we can't be sure that the media is valid or not.
			// For now, we assume that it is valid.
			// TODO: this is not safe for the size limit, we should check the size of the file.
			return NftMediaStatusEnum.OK;
		}

		const mediaType = getMediaType(type);

		if (!(mediaType === MediaType.Img) && !(mediaType === MediaType.Video)) {
			return NftMediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE;
		}

		if (Number(size) > NFT_MAX_FILESIZE_LIMIT) {
			return NftMediaStatusEnum.FILESIZE_LIMIT_EXCEEDED;
		}
	} catch (_: unknown) {
		// The error here is caused by `fetch`, which can fail for various reasons (network error, CORS, DNS, etc).
		// Empirically, it happens mostly for CORS policy block: we can't be sure that the media is valid or not.
		// For now, we assume that it is valid to avoid blocking the user.
		// Ideally, we should load this data in a backend service to avoid CORS issues.
		// TODO: this is not safe for the size limit, we should check the size of the file in the backend (or similar solutions).
		return NftMediaStatusEnum.OK;
	}

	return NftMediaStatusEnum.OK;
};

// The CORS policy raises an error everytime we try to access the media URL, so we cache the result to avoid making the same request multiple times.
// Unfortunately, the CORS errors cannot be removed from the browser: https://stackoverflow.com/questions/52807184/how-to-hide-console-status-error-message-while-fetching-in-react-js
const mediaStatusCache = new SvelteMap<string, NftMediaStatusEnum>();

export const getMediaStatusOrCache = async (mediaUrl?: string): Promise<NftMediaStatusEnum> => {
	if (isNullish(mediaUrl)) {
		return NftMediaStatusEnum.INVALID_DATA;
	}

	const cachedStatus = mediaStatusCache.get(mediaUrl);

	if (nonNullish(cachedStatus)) {
		return cachedStatus;
	}

	const status = await getMediaStatus(mediaUrl);

	mediaStatusCache.set(mediaUrl, status);

	return status;
};
