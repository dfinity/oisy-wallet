import type { ECDSA_PUBLIC_KEY } from '$lib/types/eth';
import { writable, type Readable } from 'svelte/store';

type EthAddressData = ECDSA_PUBLIC_KEY | undefined | null;

export interface EthAddressStore extends Readable<EthAddressData> {
	set: (ethAddress: ECDSA_PUBLIC_KEY) => void;
	reset: () => void;
}

const initEthAddressStore = (): EthAddressStore => {
	const { subscribe, set } = writable<EthAddressData>(undefined);

	return {
		set: (ethAddress: ECDSA_PUBLIC_KEY) => set(ethAddress),
		reset: () => set(null),
		subscribe
	};
};

export const ethAddressStore = initEthAddressStore();
