import { buildDip20Tokens } from '$icp/services/dip20-tokens.services';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutId } from '$icp/types/ic-token';
import { buildIndexedIcTokens } from '$icp/utils/ic-tokens.utils';

export const DIP20_BUILTIN_TOKENS: IcTokenWithoutId[] = buildDip20Tokens();

export const DIP20_BUILTIN_TOKENS_INDEXED: Record<LedgerCanisterIdText, IcTokenWithoutId> =
	buildIndexedIcTokens(DIP20_BUILTIN_TOKENS);
