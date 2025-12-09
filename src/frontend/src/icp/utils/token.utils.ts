import { isTokenExtV2 } from '$icp/utils/ext.utils';
import { isTokenIc } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';

// Tokens EXT v2 have zero fee
export const getTokenFee = <T extends Token>(token: Partial<T>): bigint | undefined =>
	isTokenExtV2(token) ? ZERO : isTokenIc(token) ? token.fee : undefined;
