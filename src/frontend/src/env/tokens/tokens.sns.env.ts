import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutId } from '$icp/types/ic-token';
import { buildIndexedIcTokens } from '$icp/utils/ic-tokens.utils';

export const SNS_BUILTIN_TOKENS: IcTokenWithoutId[] = buildIcrcCustomTokens();

export const SNS_BUILTIN_TOKENS_INDEXED: Record<LedgerCanisterIdText, IcTokenWithoutId> =
	buildIndexedIcTokens(SNS_BUILTIN_TOKENS);

export const GOLDAO_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	SNS_BUILTIN_TOKENS.find((t) => t.symbol === 'GOLDAO')?.ledgerCanisterId ??
	'tyyy3-4aaaa-aaaaq-aab7a-cai';
