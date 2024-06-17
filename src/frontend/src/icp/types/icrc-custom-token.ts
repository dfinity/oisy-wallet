import type { CustomToken } from '$declarations/backend/backend.did';
import type { IcToken, IcTokenWithoutId } from '$icp/types/ic';
import type { IcrcEnvToken, IcrcEnvTokenMetadata } from '$icp/types/icrc-env-token';

export type IcrcCustomTokenExtra = Pick<IcrcEnvTokenMetadata, 'alternativeName'> &
	Partial<Pick<IcrcEnvToken, 'indexCanisterVersion'>>;

export type IcTokenWithoutIdExtended = IcTokenWithoutId & IcrcCustomTokenExtra;

export type IcCustomTokenState = Omit<CustomToken, 'token' | 'version'> & {
	version?: bigint;
};

export type IcrcCustomTokenWithoutId = IcCustomTokenState & IcTokenWithoutIdExtended;

export type IcrcCustomToken = IcCustomTokenState & IcToken & IcrcCustomTokenExtra;

export type OptionIcrcCustomToken = IcrcCustomToken | undefined | null;
