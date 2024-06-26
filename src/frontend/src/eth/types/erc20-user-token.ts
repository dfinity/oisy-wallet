import type { UserToken } from '$declarations/backend/backend.did';
import type { Erc20Token } from '$eth/types/erc20';

// Type pick and omit fields to make the reader aware that we are redefining the two fields we are interested in.
export type Erc20UserTokenState = Omit<
	Pick<UserToken, 'version' | 'enabled'>,
	'version' | 'enabled'
> & {
	version?: bigint;
	enabled: boolean;
};

export type Erc20UserToken = Erc20Token & Erc20UserTokenState;

export type EthereumUserToken = Omit<Erc20UserToken, 'address' | 'exchange'> &
	Partial<Pick<Erc20Token, 'address' | 'exchange'>>;

export type OptionErc20UserToken = Erc20UserToken | undefined | null;
