import type { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { writable } from 'svelte/store';

// Lives outside the stub component because the spec type-checks under plain `tsc`, whose ambient
// `*.svelte` declaration exposes a default export and nothing else.
export const observedPriority = writable<EthFeePriority | undefined>(undefined);
