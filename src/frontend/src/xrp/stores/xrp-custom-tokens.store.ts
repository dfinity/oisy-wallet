import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { writable, type Readable } from 'svelte/store';

// The trust-line tokens saved in the user's backend token list. Replaced whole on every load, since
// the backend returns the whole list: a held line with no entry here is then one the backend does
// not have — but only once the list is certified, which is why `certified` is the list's, not each
// entry's.
export interface XrpCustomTokensData {
	tokens: XrpTrustLineCustomToken[];
	certified: boolean;
}

interface XrpCustomTokensStore extends Readable<XrpCustomTokensData | undefined> {
	set: (data: XrpCustomTokensData) => void;
	reset: () => void;
}

const initXrpCustomTokensStore = (): XrpCustomTokensStore => {
	const { subscribe, set } = writable<XrpCustomTokensData | undefined>(undefined);

	return {
		subscribe,
		set,
		reset: () => set(undefined)
	};
};

export const xrpCustomTokensStore = initXrpCustomTokensStore();
