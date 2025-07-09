import type { Nft } from '$eth/types/erc721';
import { writable, type Readable } from 'svelte/store';

export type NftStoreData = Nft[] | undefined;

export interface NftStore extends Readable<NftStoreData> {
	addAll: (nfts: Nft[]) => void;
	resetAll: () => void;
}

const initNftStore = (): NftStore => {
	const { subscribe, set, update } = writable<NftStoreData>(undefined);

	return {
		subscribe,
		addAll: (nfts: Nft[]) => {
			update((currentNfts) => {
				if (!currentNfts) {
					return nfts;
				}

				const newNfts = nfts.filter(
					(newNft) =>
						!currentNfts.some(
							(existingNft) =>
								existingNft.name === newNft.name && existingNft.contractName === newNft.contractName
						)
				);

				return [...currentNfts, ...newNfts];
			});
		},
		resetAll: () => set(undefined)
	};
};

export const nftStore = initNftStore();
