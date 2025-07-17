import type { Nft, NftId } from '$lib/types/nft';
import { writable, type Readable } from 'svelte/store';
import { isNullish } from '@dfinity/utils';

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
				if (isNullish(currentNfts)) {
					return nfts;
				}

				const newNfts = nfts.filter(
					(newNft) =>
						!currentNfts.some(
							(existingNft) =>
								existingNft.id === newNft.id &&
								existingNft.contract.address === newNft.contract.address
						)
				);

				return [...currentNfts, ...newNfts];
			});
		},
		getTokenIds: (contractAddress: string) => {
			let tokenIds: NftId = [];

			update((nfts) => {
				if (isNullish(nfts)) {
					tokenIds = [];
					return nfts;
				}

				tokenIds = nfts
					.filter((nft) => nft.contract.address.toLowerCase() === contractAddress.toLowerCase())
					.map((nft) => nft.id);

				return nfts;
			})

			return tokenIds;
		},
		resetAll: () => set(undefined)
	};
};

export const nftStore = initNftStore();
