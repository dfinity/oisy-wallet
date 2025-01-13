import type { SolAddress } from '$lib/types/address';
import type { RequiredToken, Token } from '$lib/types/token';

export type SplToken = Token & { address: SolAddress };

export type RequiredSplToken = RequiredToken<SplToken>;
