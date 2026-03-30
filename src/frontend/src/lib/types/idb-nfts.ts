import type { NullishIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { Nft, NftCollection } from '$lib/types/nft';

export type SerializableNetwork = Omit<Network, 'id'> & { id: string };

export type SerializableNftCollection = Omit<NftCollection, 'id' | 'network'> & {
	id: string;
	network: SerializableNetwork;
};

export type SerializableNft = Omit<Nft, 'collection'> & {
	collection: SerializableNftCollection;
};

export interface SetIdbNftsParams {
	identity: NullishIdentity;
	nfts: Nft[];
}
