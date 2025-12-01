import { buildDip20Tokens } from '$icp/services/dip20-tokens.services';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutIdExtended } from '$icp/types/icrc-custom-token';
import { buildIndexedIcTokens } from '$icp/utils/ic-tokens.utils';

export const DIP20_BUILTIN_TOKENS: IcTokenWithoutIdExtended[] = buildDip20Tokens();

export const DIP20_BUILTIN_TOKENS_INDEXED: Record<LedgerCanisterIdText, IcTokenWithoutIdExtended> =
	buildIndexedIcTokens(DIP20_BUILTIN_TOKENS);
