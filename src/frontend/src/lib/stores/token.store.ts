import type { OptionToken } from '$lib/types/token';
import { writable, type Readable } from 'svelte/store';

export type TokenData = OptionToken;

export interface TokenStore extends Readable<TokenData> {
	set: (token: TokenData) => void;
	reset: () => void;
}

const initTokenStore = (): TokenStore => {
	const INITIAL: TokenData = undefined;

	const { subscribe, set } = writable<TokenData>(INITIAL);

	return {
		subscribe,
		set: (token: TokenData) => set(token),
		reset: () => set(null)
	};
};

/**
 * Previously, we had two distinct screens: one displaying in which no token was selected (Tokens list) and another showing details for a selected token (Transaction page).
 * However, to provide "Receive" and "Send" actions for each token directly in the token list, we started using the store on this screen as well.
 * This was the most pragmatic approach to implement the feature within a short time frame.
 * Unfortunately, this architecture is not ideal. If the global token store is used for other features on the main screen in the future, conflicts may arise.
 * Therefore, this store is deprecated and should eventually be replaced with a method that passes down the selected token, ideally through contexts.
 * In other words, for the Hero, Receive, and Send features, we should avoid accessing a global store and instead use a dedicated state.
 * @deprecated This approach works for now but does not align with the new architectural requirements.
 */
export const token = initTokenStore();
