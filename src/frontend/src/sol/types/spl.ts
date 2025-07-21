import type { SolAddress } from '$lib/types/address';
import type { RequiredToken, Token } from '$lib/types/token';
import type { RequiredExcept } from '$lib/types/utils';

export type SplTokenAddress = SolAddress;

interface SplAuthorities {
	mintAuthority?: SplTokenAddress;
	freezeAuthority?: SplTokenAddress;
}

export type SplToken = Token & {
	address: SplTokenAddress;
	owner: SplTokenAddress;
} & SplAuthorities;

export type RequiredSplToken = RequiredExcept<RequiredToken<SplToken>, keyof SplAuthorities>;
