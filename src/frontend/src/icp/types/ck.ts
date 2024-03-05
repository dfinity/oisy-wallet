import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { PostMessageJsonDataResponse } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import type { QueryParams } from '@dfinity/utils';

export type MinterInfoParams = {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams;

export interface SyncCkMinterInfoSuccess {
	data: PostMessageJsonDataResponse;
	tokenId: TokenId;
}

export interface SyncCkMinterInfoError {
	tokenId: TokenId;
	error: unknown;
}
