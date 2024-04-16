import type { IcTokenWithoutId } from '$icp/types/ic';
import type { KnownIcrcTokenMetadata } from '$lib/types/known-token';

export type IcrcManageableToken = IcTokenWithoutId &
	Pick<KnownIcrcTokenMetadata, 'alternativeName'> & { enabled: boolean };
