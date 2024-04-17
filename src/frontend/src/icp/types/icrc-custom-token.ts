import type { CustomToken } from '$declarations/backend/backend.did';
import type { IcToken, IcTokenWithoutId } from '$icp/types/ic';
import type { IcrcEnvTokenMetadata } from '$icp/types/icrc-env-token';

export type IcrcCustomTokenConfig = IcTokenWithoutIdExtended & { enabled: boolean };

export type IcTokenWithoutIdExtended = IcTokenWithoutId &
	Pick<IcrcEnvTokenMetadata, 'alternativeName'>;

export type IcCustomTokenState = Omit<CustomToken, 'token' | 'timestamp'> & {
	timestamp?: bigint;
};

export type IcrcCustomTokenWithoutId = IcCustomTokenState & IcTokenWithoutId;

export type IcrcCustomToken = IcCustomTokenState & IcToken;
