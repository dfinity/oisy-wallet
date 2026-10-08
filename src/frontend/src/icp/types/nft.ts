import type { Dip721Token } from '$icp/types/dip721-token';
import type { ExtToken } from '$icp/types/ext-token';
import type { IcPunksToken } from '$icp/types/icpunks-token';
import type { Icrc7Token } from '$icp/types/icrc7-token';

export type IcNonFungibleToken = ExtToken | Dip721Token | IcPunksToken | Icrc7Token;
