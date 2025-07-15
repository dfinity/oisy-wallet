import type { Nft } from '$lib/types/nft';
import { get, writable, type Readable } from 'svelte/store';

export type NftStoreData = Nft[] | undefined;

export interface NftStore extends Readable<NftStoreData> {
	addAll: (nfts: Nft[]) => void;
	getTokenIds: (contractAddress: string) => number[];
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
								existingNft.name === newNft.name &&
								existingNft.contract.address === newNft.contract.address
						)
				);

				return [...currentNfts, ...newNfts];
			});
		},
		getTokenIds: (contractAddress: string) => {
			const currentNfts = get(nftStore);

			if (!currentNfts) {
				return [];
			}

			return currentNfts
				.filter((nft) => nft.contract.address.toLowerCase() === contractAddress.toLowerCase())
				.map((nft) => nft.id);
		},
		resetAll: () => set(undefined)
	};
};

export const nftStore = initNftStore();
