import type { IcrcCustomToken, IcrcCustomTokenWithoutId } from '$icp/types/icrc-custom-token';
import type { CanisterIdText } from '$lib/types/canister';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type IcrcCustomTokensData = CertifiedData<IcrcCustomToken>[] | undefined | null;

export interface IcrcCustomTokensStore extends Readable<IcrcCustomTokensData> {
	set: (token: CertifiedData<IcrcCustomTokenWithoutId>) => void;
	reset: (ledgerCanisterId: CanisterIdText) => void;
	clear: () => void;
}

const initIcrcCustomTokensStore = (): IcrcCustomTokensStore => {
	const { subscribe, update, set } = writable<IcrcCustomTokensData>(undefined);

	return {
		set: ({ data, certified }) =>
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
		reset: (ledgerCanisterId: CanisterIdText) =>
			update((state) => [
				...(state ?? []).filter(({ data: { ledgerCanisterId: id } }) => id !== ledgerCanisterId)
			]),
		clear: () => set(null),
		subscribe
	};
};

// TODO: This is the same logic as icrc.store except clear
export const icrcCustomTokensStore = initIcrcCustomTokensStore();
