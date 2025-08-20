import type { Nft } from '$lib/types/nft';
import { isNullish, nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type NftStoreData = Nft[] | undefined;

export interface NftStore extends Readable<NftStoreData> {
	addAll: (nfts: Nft[]) => void;
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

				const newNfts = nfts.filter(
					(newNft) =>
						!currentNfts.some(
							(existingNft) =>
								existingNft.id === newNft.id &&
								existingNft.collection.address === newNft.collection.address &&
								existingNft.collection.network === newNft.collection.network
						)
				);

				return [...currentNfts, ...newNfts];
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
								currentNft.collection.address == nftToRemove.collection.address &&
								currentNft.collection.network === nftToRemove.collection.network
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
							nft.collection.address === currentNft.collection.address &&
							nft.collection.network === currentNft.collection.network
					);

					return nonNullish(updatedNft) ? updatedNft : currentNft;
				});
			});
		},
		resetAll: () => set(undefined)
	};
};

export const nftStore = initNftStore();
