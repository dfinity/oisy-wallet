import { writable, type Readable } from 'svelte/store';
import type { IcToken } from '../types/ic';

export type IcrcTokensData = IcToken[] | undefined;

export interface IcrcTokensStore extends Readable<IcrcTokensData> {
	set: (tokens: IcrcTokensData) => void;
	add: (token: IcToken) => void;
	reset: () => void;
}

const initIcrcTokensStore = (): IcrcTokensStore => {
	const INITIAL: IcrcTokensData = undefined;

	const { subscribe, set, update } = writable<IcrcTokensData>(INITIAL);

	return {
		set: (tokens: IcrcTokensData) => set(tokens),
		add: (token: IcToken) =>
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
