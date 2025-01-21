import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { TokenId } from '$lib/types/token';
import type { SplToken } from '$sol/types/spl';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { writable, type Readable } from 'svelte/store';

export interface CertifiedSplDefaultTokensStore extends Readable<SplTokenToggleable[]> {
	update: (tokens: SplTokenToggleable[]) => void;
}

export const initCertifiedSplDefaultTokensStore = (): CertifiedSplDefaultTokensStore => {
	const INITIAL: SplTokenToggleable[] = SPL_TOKENS.map((token) => ({ ...token, enabled: false }));

	const { subscribe, update } = writable<SplTokenToggleable[]>(INITIAL);

	return {
		update: (tokens: SplTokenToggleable[]) =>
			tokens.forEach((token) =>
				update((state) => [...(state ?? []).map((t) => (t.id === token.id ? token : t))])
			),
		subscribe
	};
};

export type SplDefaultTokensData = SplToken[] | undefined;

export interface SplDefaultTokensStore extends Readable<SplDefaultTokensData> {
	set: (tokens: SplDefaultTokensData) => void;
	add: (token: SplToken) => void;
	remove: (tokenId: TokenId) => void;
	reset: () => void;
}

const initSplDefaultTokensStore = (): SplDefaultTokensStore => {
	const INITIAL: SplDefaultTokensData = undefined;

	const { subscribe, set, update } = writable<SplDefaultTokensData>(INITIAL);

	return {
		set: (tokens: SplDefaultTokensData) => set(tokens),
		add: (token: SplToken) =>
			update((state) => [
				...(state ?? []).filter(
					({ address }) => address.toLowerCase() !== token.address.toLowerCase()
				),
				token
			]),
		remove: (tokenId: TokenId) =>
			update((state) => [...(state ?? []).filter(({ id }) => id !== tokenId)]),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const splDefaultTokensStore = initSplDefaultTokensStore();
