import type { Erc20Token } from '$eth/types/erc20';
import type { UserToken } from '$lib/types/user-token';
import type { Option } from '$lib/types/utils';

export type Erc20UserToken = UserToken<Erc20Token>;

export type EthereumUserToken = Omit<Erc20UserToken, 'address' | 'exchange'> &
	Partial<Pick<Erc20Token, 'address' | 'exchange'>>;

export type OptionErc20UserToken = Option<Erc20UserToken>;

export type SaveUserToken = Pick<
	Erc20UserToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<Erc20UserToken, 'id'>>;
