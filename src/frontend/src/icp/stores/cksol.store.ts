import type { SolAddress } from '$sol/types/address';
import { writable } from 'svelte/store';

// The minter's main address, which pays out every conversion of ckSOL to SOL.
export const ckSolMinterAddressStore = writable<SolAddress | undefined>(undefined);

// The ckSOL deposit address of each principal, which takes in every conversion of SOL to ckSOL.
// Keyed by principal, since a sign-in in another tab switches this tab's identity without a
// reload.
export const ckSolDepositAddressesStore = writable<Partial<Record<string, SolAddress>>>({});
