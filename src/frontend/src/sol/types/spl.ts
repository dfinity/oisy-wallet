import type { SolAddress } from '$lib/types/address';
import type { RequiredToken, Token } from '$lib/types/token';

export type SplTokenAddress = SolAddress;

export type SplToken = Token & {
	address: SplTokenAddress;
	owner: SplTokenAddress;
};

export type RequiredSplToken = RequiredToken<SplToken>;
