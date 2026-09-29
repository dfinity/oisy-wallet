import type { TokenId } from '$lib/types/token';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import { writable, type Readable } from 'svelte/store';

// The trust lines the ledger reports for an XRP account, keyed by the account's native XRP token,
// as the rest of that account's wallet state is. No entry: not read yet.
export type XrpTrustLinesData = Partial<Record<TokenId, XrpTrustLine[]>>;

interface XrpTrustLinesStore extends Readable<XrpTrustLinesData> {
	set: (params: { tokenId: TokenId; lines: XrpTrustLine[] }) => void;
	clear: (tokenId: TokenId) => void;
}

const initXrpTrustLinesStore = (): XrpTrustLinesStore => {
	const { subscribe, update } = writable<XrpTrustLinesData>({});

	return {
		subscribe,
		set: ({ tokenId, lines }) => update((state) => ({ ...state, [tokenId]: lines })),
		clear: (tokenId) =>
			update((state) => {
				const { [tokenId]: _, ...rest } = state;
				return rest;
			})
	};
};

export const xrpTrustLinesStore = initXrpTrustLinesStore();
