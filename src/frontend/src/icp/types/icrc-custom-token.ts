import type { IcTokenWithoutId } from '$icp/types/ic';
import type { IcrcEnvTokenMetadata } from '$icp/types/icrc-env-token';

export type IcrcCustomTokenConfig = IcrcCustomToken & { enabled: boolean };

export type IcrcCustomToken = IcTokenWithoutId & Pick<IcrcEnvTokenMetadata, 'alternativeName'>;
