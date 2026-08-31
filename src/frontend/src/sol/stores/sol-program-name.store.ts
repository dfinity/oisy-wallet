import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import { writable, type Readable } from 'svelte/store';

/**
 * Keyed by network and then by program: the same address is a different deployment on each
 * cluster, and a devnet program must not inherit a mainnet name.
 */
export type SolProgramNameData = Partial<
	Record<SolanaNetworkType, Partial<Record<SolAddress, string>>>
>;

interface SolProgramNameStore extends Readable<SolProgramNameData> {
	set: (params: { network: SolanaNetworkType; names: Partial<Record<SolAddress, string>> }) => void;
	reset: () => void;
}

/**
 * The name a program publishes for itself, for programs OISY does not decode.
 *
 * A program that publishes none is recorded under the empty string rather than left out, so it is
 * asked about once per session instead of once per transaction it appears in.
 *
 * Never evicted within a session. An upgrade could change the name under us, which is a stale
 * label at worst: nothing the review states about value comes from here.
 */
const initSolProgramNameStore = (): SolProgramNameStore => {
	const { subscribe, update, set } = writable<SolProgramNameData>({});

	return {
		subscribe,
		set: ({ network, names }) =>
			update((state) => ({ ...state, [network]: { ...(state[network] ?? {}), ...names } })),
		reset: () => set({})
	};
};

export const solProgramNameStore = initSolProgramNameStore();
