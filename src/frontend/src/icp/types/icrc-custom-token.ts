import type { EnvIcrcToken, EnvIcrcTokenMetadata } from '$env/types/env-icrc-token';
import type { IcToken, IcTokenWithoutId } from '$icp/types/ic';
import type { TokenToggleable, UserTokenState } from '$lib/types/token-toggleable';

export type IcrcCustomTokenExtra = Pick<EnvIcrcTokenMetadata, 'alternativeName'> &
	Partial<Pick<EnvIcrcToken, 'indexCanisterVersion'>>;

export type IcTokenWithoutIdExtended = IcTokenWithoutId & IcrcCustomTokenExtra;

export type IcrcCustomTokenWithoutId = UserTokenState & IcTokenWithoutIdExtended;

export type IcrcCustomToken = TokenToggleable<IcToken> & IcrcCustomTokenExtra;

export type OptionIcrcCustomToken = IcrcCustomToken | undefined | null;
