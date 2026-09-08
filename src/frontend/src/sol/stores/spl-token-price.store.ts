import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import { writable, type Readable } from 'svelte/store';

/**
 * Keyed by network and then by mint, in USD. The same address exists on several clusters, and a
 * price only ever belongs to the one it was fetched for.
 */
export type SplTokenPriceData = Partial<
	Record<SolanaNetworkType, Partial<Record<SplTokenAddress, number>>>
>;

interface SplTokenPriceStore extends Readable<SplTokenPriceData> {
	set: (params: {
		network: SolanaNetworkType;
		prices: Partial<Record<SplTokenAddress, number>>;
	}) => void;
	reset: () => void;
}

/**
 * USD prices of mints the wallet does not hold, fetched for the transaction in front of the user.
 *
 * Separate from the exchange store, which prices the portfolio: that one follows the tokens the
 * user enabled, on a timer, and a mint under review is neither. Separate from the mint metadata
 * store too, which is never evicted because a name does not change under us. A price does, so a
 * mint asked about again is overwritten rather than answered from what it cost last time.
 */
const initSplTokenPriceStore = (): SplTokenPriceStore => {
	const { subscribe, update, set } = writable<SplTokenPriceData>({});

	return {
		subscribe,
		set: ({ network, prices }) =>
			update((state) => ({ ...state, [network]: { ...(state[network] ?? {}), ...prices } })),
		reset: () => set({})
	};
};

export const splTokenPriceStore = initSplTokenPriceStore();
