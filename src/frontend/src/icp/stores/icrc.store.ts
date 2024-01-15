import type { IcToken } from '$icp/types/ic';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type IcrcTokensData = CertifiedData<IcToken>[] | undefined | null;

export interface IcrcTokensStore extends Readable<IcrcTokensData> {
	set: (token: CertifiedData<IcToken>) => void;
	reset: () => void;
}

const initIcrcTokensStore = (): IcrcTokensStore => {
	const { subscribe, set, update } = writable<IcrcTokensData>(undefined);

	return {
		set: (token: CertifiedData<IcToken>) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { ledgerCanisterId } }) => ledgerCanisterId !== token.data.ledgerCanisterId
				),
				token
			]),
		reset: () => set(null),
		subscribe
	};
};

export const icrcTokensStore = initIcrcTokensStore();
