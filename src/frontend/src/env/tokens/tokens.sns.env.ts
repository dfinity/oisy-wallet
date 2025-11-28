import {
	buildIcrcCustomTokens,
	buildIndexedIcrcCustomTokens
} from '$icp/services/icrc-custom-tokens.services';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutIdExtended } from '$icp/types/icrc-custom-token';

export const SNS_BUILTIN_TOKENS: IcTokenWithoutIdExtended[] = buildIcrcCustomTokens();

export const SNS_BUILTIN_TOKENS_INDEXED: Record<LedgerCanisterIdText, IcTokenWithoutIdExtended> =
	buildIndexedIcrcCustomTokens(SNS_BUILTIN_TOKENS);
