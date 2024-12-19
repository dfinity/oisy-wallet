import type { Erc20Token } from '$eth/types/erc20';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

export type SplUserToken = SplTokenToggleable;

export type SolanaUserToken = Omit<SplUserToken, 'address' | 'exchange'> &
	Partial<Pick<Erc20Token, 'address' | 'exchange'>>;
