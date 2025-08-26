import type { Token as BackendToken } from '$declarations/backend/backend.did';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { Token } from '$lib/types/token';
import type { TokenToggleable, UserTokenState } from '$lib/types/token-toggleable';
import type { SplToken } from '$sol/types/spl';
import type { QueryAndUpdateRequestParams } from '@dfinity/utils';
import type TokenState from '$lib/enums/token-state'

type CustomTokenNetworkKeys = BackendToken extends infer T
	? T extends Record<string, unknown>
		? keyof T
		: never
	: never;

type TokenVariant<K extends CustomTokenNetworkKeys, T> = T & { networkKey: K };

export type IcrcSaveCustomToken = Pick<IcrcCustomToken, 'ledgerCanisterId' | 'indexCanisterId'>;

export type ErcSaveCustomToken = Pick<Erc20Token, 'address'> &
	Pick<Erc20Token['network'], 'chainId'>;

export type SplSaveCustomToken = Pick<SplToken, 'address' | 'decimals' | 'symbol'>;

export type SaveCustomToken = UserTokenState &
	(IcrcSaveCustomToken | ErcSaveCustomToken | SplSaveCustomToken);

export type SaveCustomTokenWithKey = UserTokenState &
	(
		| TokenVariant<'Icrc', IcrcSaveCustomToken>
		| TokenVariant<'Erc20' | 'Erc721' | 'Erc1155', ErcSaveCustomToken>
		| TokenVariant<'SplDevnet' | 'SplMainnet', SplSaveCustomToken>
	);

export type CustomToken<T extends Token> = TokenToggleable<T> & { state?: TokenState };

export type LoadCustomTokenParams = QueryAndUpdateRequestParams & { useCache?: boolean };
