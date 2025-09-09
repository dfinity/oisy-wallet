import { NftCollectionSchema } from '$lib/schema/nft.schema';
import type { NftSortingType } from '$lib/stores/settings.store';
import type { EthAddress } from '$lib/types/address';
import type { NftError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NftCollection, NftCollectionUi, NftId, NonFungibleToken } from '$lib/types/nft';
import { UrlSchema } from '$lib/validation/url.validation';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

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

export const findNewNftIds = ({
	nfts,
	token,
	inventory
}: {
	nfts: Nft[];
	token: NonFungibleToken;
	inventory: NftId[];
}): NftId[] => inventory.filter((tokenId) => isNullish(findNft({ nfts, token, tokenId })));

export const findRemovedNfts = ({
	nfts,
	token,
	inventory
}: {
	nfts: Nft[];
	token: NonFungibleToken;
	inventory: NftId[];
}): Nft[] =>
	nfts.filter(
		(nft) =>
			nft.collection.network === token.network &&
			nft.collection.address === token.address &&
			isNullish(inventory.find((nftId) => nftId === nft.id))
	);

export const getUpdatedNfts = ({
	nfts,
	token,
	inventory
}: {
	nfts: Nft[];
	token: NonFungibleToken;
	inventory: Nft[];
}): Nft[] =>
	(nfts ?? []).reduce<Nft[]>((acc, nft) => {
		if (nft.collection.address !== token.address || nft.collection.network !== token.network) {
			return acc;
		}

		const ownedNft = inventory.find((ownedNft) => ownedNft.id === nft.id);

		if (nonNullish(ownedNft) && nft.balance !== ownedNft.balance) {
			acc.push({
				...nft,
				balance: ownedNft.balance
			});
		}

		return acc;
	}, []);

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

// Single implementation (T is Nft or NftCollectionUi)
export const filterSortByCollection: FilterSortByCollection = <T extends Nft | NftCollectionUi>({
	items,
	filter,
	sort
}: NftBaseFilterAndSortParams<T>): T[] => {
	let result = items;

	if (nonNullish(filter)) {
		result = result.filter((it) =>
			(it.collection?.name?.toLowerCase() ?? '').includes(filter.toLowerCase())
		);
	}

	if (nonNullish(sort)) {
		const dir = sort.order === 'asc' ? 1 : -1;

		if (sort.type === 'collection-name') {
			result = [...result].sort((a, b) => cmpByCollectionName(dir)({ a, b }));
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
	tokens.find((token) => token.address === address && token.network.id === networkId);

// We offer this util so we dont mistakingly take the value from the nfts collection prop,
// as it is not updated after updating the consent. Going through this function ensures no stale data
export const getAllowMediaForNft = (params: {
	tokens: NonFungibleToken[];
	address: EthAddress;
	networkId: NetworkId;
}): boolean | undefined => findNonFungibleToken(params)?.allowExternalContentSource;
