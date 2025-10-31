import type { NetworkId } from '$lib/types/network';
import type { Nft } from '$lib/types/nft';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type NftStoreData = Nft[] | undefined;

export interface NftStore extends Readable<NftStoreData> {
	addAll: (nfts: Nft[]) => void;
	setAllByNetwork: (params: { nfts: Nft[]; networkId: NetworkId }) => void;
	removeSelectedNfts: (nfts: Nft[]) => void;
	updateSelectedNfts: (nfts: Nft[]) => void;
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
		removeSelectedNfts: (nfts: Nft[]) => {
			update((currentNfts) => {
				if (isNullish(currentNfts)) {
					return currentNfts;
				}

				return currentNfts.filter(
					(currentNft) =>
						!nfts.some(
							(nftToRemove) =>
								currentNft.id === nftToRemove.id &&
								areAddressesEqual({
									address1: currentNft.collection.address,
									address2: nftToRemove.collection.address,
									networkId: currentNft.collection.network.id
								}) &&
								currentNft.collection.network.id === nftToRemove.collection.network.id
						)
				);
			});
		},
		updateSelectedNfts: (nfts: Nft[]) => {
			update((currentNfts) => {
				if (isNullish(currentNfts)) {
					return currentNfts;
				}

				return currentNfts.map((currentNft) => {
					const updatedNft = nfts.find(
						(nft) =>
							nft.id === currentNft.id &&
							areAddressesEqual({
								address1: nft.collection.address,
								address2: currentNft.collection.address,
								networkId: currentNft.collection.network.id
							}) &&
							nft.collection.network.id === currentNft.collection.network.id
					);

					return nonNullish(updatedNft) ? updatedNft : currentNft;
				});
			});
		},
		resetAll: () => set(undefined)
	};
};

export const nftStore = initNftStore();
