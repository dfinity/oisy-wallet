import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
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

export const splDefaultTokensStore = initCertifiedSplDefaultTokensStore();
