import type { IcToken } from '$icp/types/ic-token';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { isTokenDip721 } from '$icp/utils/dip721.utils';
import { isTokenExt } from '$icp/utils/ext.utils';
import { isTokenIcPunks } from '$icp/utils/icpunks.utils';
import { isTokenIcrc7 } from '$icp/utils/icrc7.utils';
import { CanisterInternalError } from '$lib/canisters/errors';
import { PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES } from '$lib/enums/plausible';
import { RejectError } from '@icp-sdk/core/agent';

export const isTokenIcNft = (token: Partial<IcToken>): token is IcNonFungibleToken =>
	isTokenExt(token) || isTokenDip721(token) || isTokenIcPunks(token) || isTokenIcrc7(token);

/**
 * The category of an ICP NFT send failure, tracked in place of its message. See
 * `PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES` for why the message itself is not.
 */
export const toIcNftSendErrorType = (err: unknown): PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES =>
	err instanceof CanisterInternalError
		? PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.CANISTER_ERROR
		: err instanceof RejectError
			? PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.CALL_REJECTED
			: PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.UNKNOWN;
