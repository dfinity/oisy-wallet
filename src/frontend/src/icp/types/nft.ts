import type { Dip721Token } from '$icp/types/dip721-token';
import type { ExtToken } from '$icp/types/ext-token';
import type { IcPunksToken } from '$icp/types/icpunks-token';

export type IcNonFungibleToken = ExtToken | Dip721Token | IcPunksToken;
