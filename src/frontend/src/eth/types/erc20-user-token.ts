import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20TokenToggleable } from '$eth/types/erc20-token-toggleable';

export type Erc20UserToken = Erc20TokenToggleable;

export type EthereumUserToken = Omit<Erc20UserToken, 'address' | 'exchange'> &
	Partial<Pick<Erc20Token, 'address' | 'exchange'>>;

export type OptionErc20UserToken = Erc20UserToken | undefined | null;
