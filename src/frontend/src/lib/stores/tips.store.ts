import type { MyTip } from '$declarations/backend/backend.did';
import { writable, type Readable } from 'svelte/store';

export type TipsData = MyTip[] | undefined;

export interface TipsStore extends Readable<TipsData> {
	set: (tips: MyTip[]) => void;
	reset: () => void;
}

/**
 * The signed-in user's own tips.
 *
 * Loaded because of what it is *for*: an active tip holds an allowance against
 * the user's balance, and the wallet must stop offering to spend money that is
 * already promised. See `reservedTipAmounts`.
 *
 * `undefined` means "not loaded yet", which is deliberately distinct from an
 * empty array. Treating the two the same would briefly show the full balance as
 * spendable on every sign-in.
 */
const initTipsStore = (): TipsStore => {
	const { subscribe, set } = writable<TipsData>(undefined);

	return {
		subscribe,
		set: (tips: MyTip[]) => set(tips),
		reset: () => set(undefined)
	};
};

export const tipsStore = initTipsStore();
