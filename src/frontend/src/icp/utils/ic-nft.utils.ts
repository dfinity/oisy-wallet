import type { IcToken } from '$icp/types/ic-token';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { isTokenDip721 } from '$icp/utils/dip721.utils';
import { isTokenExt } from '$icp/utils/ext.utils';
import { isTokenIcPunks } from '$icp/utils/icpunks.utils';

export const isTokenIcNft = (token: Partial<IcToken>): token is IcNonFungibleToken =>
	isTokenExt(token) || isTokenDip721(token) || isTokenIcPunks(token);
