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
			const uniqueNfts = nfts.reduce<Nft[]>((acc, current) => {
				if (
					!acc.some(
						(nft) => nft.id === current.id && nft.contract.address === current.contract.address
					)
				) {
					acc.push(current);
				}
				return acc;
			}, []);

			update((currentNfts) => {
				if (!currentNfts) {
					return uniqueNfts;
				}

				const newNfts = uniqueNfts.filter(
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
