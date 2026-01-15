import type { RequiredToken, Token } from '$lib/types/token';
import type { SolAddress } from '$sol/types/address';

export type SplTokenAddress = SolAddress;

interface SplAuthorities {
	mintAuthority?: SplTokenAddress;
	freezeAuthority?: SplTokenAddress;
}

export type SplToken = Token & {
	address: SplTokenAddress;
	owner: SplTokenAddress;
} & SplAuthorities;

export type RequiredSplToken = RequiredToken<SplToken, SplAuthorities>;

export type RequiredSpl2022Token = RequiredToken<SplToken>;
