import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { QueryParams } from '@dfinity/utils';

export type MinterInfoParams = {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams;
