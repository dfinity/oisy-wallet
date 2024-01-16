import type { IcToken, IcTokenWithoutId } from '$icp/types/ic';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type IcrcTokensData = CertifiedData<IcToken>[] | undefined | null;

export interface IcrcTokensStore extends Readable<IcrcTokensData> {
	set: (token: CertifiedData<IcTokenWithoutId>) => void;
	reset: () => void;
}

const initIcrcTokensStore = (): IcrcTokensStore => {
	const { subscribe, set, update } = writable<IcrcTokensData>(undefined);

	return {
		set: ({ data, certified }: CertifiedData<IcTokenWithoutId>) =>
			update((state) => [
				...(state ?? []).filter(
					({ data: { ledgerCanisterId } }) => ledgerCanisterId !== data.ledgerCanisterId
				),
				{
					certified,
					data: {
						// We are using Symbols as key IDs for the ETH and ICP tokens, which is ideal for our use case due to their uniqueness. This ensures that even if two coins fetched dynamically have the same symbol or name, they will be used correctly.
						// However, this approach presents a challenge with ICRC tokens, which need to be loaded twice - once with a query and once with an update. When they are loaded the second time, the existing Symbol should be reused to ensure they are identified as the same token.
						id:
							(state ?? []).find(
								({ data: { ledgerCanisterId } }) => ledgerCanisterId === data.ledgerCanisterId
							)?.data.id ?? Symbol(data.symbol),
						...data
					}
				}
			]),
		reset: () => set(null),
		subscribe
	};
};

export const icrcTokensStore = initIcrcTokensStore();
