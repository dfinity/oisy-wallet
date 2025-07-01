import type { Token } from '$declarations/backend/backend.did';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { UserTokenState } from '$lib/types/token-toggleable';
import type { SplToken } from '$sol/types/spl';

export type CustomTokenNetworkKeys = Token extends infer T
	? T extends Record<string, unknown>
		? keyof T
		: never
	: never;

type BaseIcrc = Pick<IcrcCustomToken, 'ledgerCanisterId' | 'indexCanisterId'>;
type BaseErc20 = Pick<Erc20Token, 'address' | 'decimals' | 'symbol'> &
	Pick<Erc20Token['network'], 'chainId'>;
type BaseSpl = Pick<SplToken, 'address' | 'decimals' | 'symbol'>;

type TokenVariant<K extends CustomTokenNetworkKeys, T> = T & { networkKey: K };

export type IcrcSaveCustomToken = BaseIcrc;
export type Erc20SaveCustomToken = BaseErc20;
export type SplSaveCustomToken = BaseSpl;

export type SaveCustomToken = UserTokenState &
	(IcrcSaveCustomToken | Erc20SaveCustomToken | SplSaveCustomToken);

export type SaveCustomTokenWithKey = UserTokenState &
	(
		| TokenVariant<'Icrc', BaseIcrc>
		| TokenVariant<'Erc20', BaseErc20>
		| TokenVariant<'SplDevnet' | 'SplMainnet', BaseSpl>
	);
