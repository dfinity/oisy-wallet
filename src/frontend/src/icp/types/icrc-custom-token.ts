import type { IcToken, IcTokenWithoutId } from '$icp/types/ic';
import type { IcrcEnvToken, IcrcEnvTokenMetadata } from '$icp/types/icrc-env-token';
import type { TokenToggleable, UserTokenState } from '$lib/types/token-toggleable';

export type IcrcCustomTokenExtra = Pick<IcrcEnvTokenMetadata, 'alternativeName'> &
	Partial<Pick<IcrcEnvToken, 'indexCanisterVersion'>>;

export type IcTokenWithoutIdExtended = IcTokenWithoutId & IcrcCustomTokenExtra;

export type IcrcCustomTokenWithoutId = UserTokenState & IcTokenWithoutIdExtended;

export type IcrcCustomToken = TokenToggleable<IcToken> & IcrcCustomTokenExtra;

export type OptionIcrcCustomToken = IcrcCustomToken | undefined | null;
