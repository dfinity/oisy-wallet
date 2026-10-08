import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import { isTokenIc } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';

// IC NFT collections (EXT, DIP-721, IcPunks, ICRC-7) have zero transfer fee.
export const getTokenFee = <T extends Token>(token: Partial<T>): bigint | undefined =>
	isTokenIcNft(token) ? ZERO : isTokenIc(token) ? token.fee : undefined;
