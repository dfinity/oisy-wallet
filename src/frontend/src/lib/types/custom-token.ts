import type { Token as BackendToken } from '$declarations/backend/backend.did';
import type { Erc20Token } from '$eth/types/erc20';
import type { Dip721Token } from '$icp/types/dip721-token';
import type { ExtToken } from '$icp/types/ext-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Token } from '$lib/types/token';
import type { TokenToggleable, UserTokenState } from '$lib/types/token-toggleable';
import type { SplToken } from '$sol/types/spl';
import type { QueryAndUpdateRequestParams } from '@dfinity/utils';

type CustomTokenNetworkKeys = BackendToken extends infer T
	? T extends Record<string, unknown>
		? keyof T
		: never
	: never;

export type TokenVariant<K extends CustomTokenNetworkKeys, T> = T & { networkKey: K };

export type IcrcSaveCustomToken = Pick<IcToken, 'ledgerCanisterId' | 'indexCanisterId'>;

export type ExtSaveCustomToken = Pick<ExtToken, 'canisterId'>;

export type Dip721SaveCustomToken = Pick<Dip721Token, 'canisterId'>;

export type ErcSaveCustomToken = Pick<Erc20Token, 'address'> &
	Pick<Erc20Token['network'], 'chainId'>;

export type SplSaveCustomToken = Pick<SplToken, 'address' | 'decimals' | 'symbol'>;

export type SaveCustomToken = UserTokenState &
	(IcrcSaveCustomToken | ExtSaveCustomToken | ErcSaveCustomToken | SplSaveCustomToken);

export type SaveCustomTokenWithKey = UserTokenState &
	(
		| TokenVariant<'Icrc', IcrcSaveCustomToken>
		| TokenVariant<'Erc20' | 'Erc721' | 'Erc1155', ErcSaveCustomToken>
		| TokenVariant<'SplDevnet' | 'SplMainnet', SplSaveCustomToken>
		| TokenVariant<'ExtV2', ExtSaveCustomToken>
		| TokenVariant<'Dip721', Dip721SaveCustomToken>
	);

export type SaveCustomErcVariant = UserTokenState &
	TokenVariant<'Erc20' | 'Erc721' | 'Erc1155', ErcSaveCustomToken>;
export type SaveCustomErc721Variant = UserTokenState & TokenVariant<'Erc721', ErcSaveCustomToken>;
export type SaveCustomErc1155Variant = UserTokenState & TokenVariant<'Erc1155', ErcSaveCustomToken>;
export type SaveCustomExtVariant = UserTokenState & TokenVariant<'ExtV2', ExtSaveCustomToken>;

export type CustomToken<T extends Token> = TokenToggleable<T>;

export type LoadCustomTokenParams = QueryAndUpdateRequestParams & { useCache?: boolean };
