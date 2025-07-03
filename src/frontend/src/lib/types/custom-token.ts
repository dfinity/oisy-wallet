import type { Token as BackendToken } from '$declarations/backend/backend.did';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { Token } from '$lib/types/token';
import type { TokenToggleable, UserTokenState } from '$lib/types/token-toggleable';
import type { SplToken } from '$sol/types/spl';

type CustomTokenNetworkKeys = BackendToken extends infer T
	? T extends Record<string, unknown>
		? keyof T
		: never
	: never;

type TokenVariant<K extends CustomTokenNetworkKeys, T> = T & { networkKey: K };

export type IcrcSaveCustomToken = Pick<IcrcCustomToken, 'ledgerCanisterId' | 'indexCanisterId'>;

export type Erc20SaveCustomToken = Pick<Erc20Token, 'address' | 'decimals' | 'symbol'> &
	Pick<Erc20Token['network'], 'chainId'>;

export type SplSaveCustomToken = Pick<SplToken, 'address' | 'decimals' | 'symbol'>;

export type SaveCustomToken = UserTokenState &
	(IcrcSaveCustomToken | Erc20SaveCustomToken | SplSaveCustomToken);

export type SaveCustomTokenWithKey = UserTokenState &
	(
		| TokenVariant<'Icrc', IcrcSaveCustomToken>
		| TokenVariant<'Erc20', Erc20SaveCustomToken>
		| TokenVariant<'SplDevnet' | 'SplMainnet', SplSaveCustomToken>
	);

export type CustomToken<T extends Token> = TokenToggleable<T>;
