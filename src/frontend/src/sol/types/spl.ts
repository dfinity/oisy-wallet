import type { SolAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';

export type SplToken = Token & { address: SolAddress; programAddress: SolAddress };
