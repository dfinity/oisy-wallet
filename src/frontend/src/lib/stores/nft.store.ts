import type { NetworkId } from '$lib/types/network';
import type { Nft } from '$lib/types/nft';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { isNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type NftStoreData = Nft[] | undefined;

export interface NftStore extends Readable<NftStoreData> {
	addAll: (nfts: Nft[]) => void;
	setAllByNetwork: (params: { nfts: Nft[]; networkId: NetworkId }) => void;
	resetAll: () => void;
}

const initNftStore = (): NftStore => {
	const { subscribe, set, update } = writable<NftStoreData>(undefined);

	return {
		subscribe,
		addAll: (nfts: Nft[]) => {
			update((currentNfts) => {
				if (isNullish(currentNfts)) {
					return nfts;
				}

				const oldNfts = currentNfts.filter(
					(oldNft) =>
						!nfts.some(
							(newNft) =>
								newNft.id === oldNft.id &&
								areAddressesEqual({
									address1: newNft.collection.address,
									address2: oldNft.collection.address,
									networkId: newNft.collection.network.id
								}) &&
								newNft.collection.network.id === oldNft.collection.network.id
						)
				);

				return [...oldNfts, ...nfts];
			});
		},
		setAllByNetwork: ({ networkId, nfts }: { networkId: NetworkId; nfts: Nft[] }) => {
			update((currentNfts) => {
				if (isNullish(currentNfts)) {
					return nfts;
				}

				const oldNfts = currentNfts.filter(
					({
						collection: {
							network: { id: nftNetworkId }
						}
					}) => nftNetworkId !== networkId
				);

				return [...oldNfts, ...nfts];
			});
		},
		resetAll: () => set(undefined)
	};
};

export const nftStore = initNftStore();
