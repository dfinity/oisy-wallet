import type { IcToken } from '$icp/types/ic-token';
import type { IcPunksToken } from '$icp/types/icpunks-token';

export const isTokenIcPunks = (token: Partial<IcToken>): token is IcPunksToken =>
	token.standard?.code === 'icpunks';
