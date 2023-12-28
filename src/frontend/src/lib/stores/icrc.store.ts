import type { IcrcToken } from '$lib/types/icrc';
import { writable, type Readable } from 'svelte/store';

export type IcrcTokensData = IcrcToken[] | undefined;

export interface IcrcTokensStore extends Readable<IcrcTokensData> {
	set: (tokens: IcrcTokensData) => void;
	add: (token: IcrcToken) => void;
	reset: () => void;
}

const initIcrcTokensStore = (): IcrcTokensStore => {
	const INITIAL: IcrcTokensData = undefined;

	const { subscribe, set, update } = writable<IcrcTokensData>(INITIAL);

	return {
		set: (tokens: IcrcTokensData) => set(tokens),
		add: (token: IcrcToken) =>
			update((state) => [
				...(state ?? []).filter(
					({ ledgerCanisterId }) => ledgerCanisterId !== token.ledgerCanisterId
				),
				token
			]),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const icrcTokensStore = initIcrcTokensStore();
