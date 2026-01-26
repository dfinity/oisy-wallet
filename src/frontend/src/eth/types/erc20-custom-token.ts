import type { Erc20Token } from '$eth/types/erc20';
import type { CustomToken } from '$lib/types/custom-token';

export type Erc20CustomToken = CustomToken<Erc20Token>;

export type SaveErc20CustomToken = Pick<
	Erc20CustomToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<Erc20CustomToken, 'id'>>;

export type EthereumCustomToken = Omit<Erc20CustomToken, 'address' | 'exchange'> &
	Partial<Pick<Erc20Token, 'address' | 'exchange'>>;
