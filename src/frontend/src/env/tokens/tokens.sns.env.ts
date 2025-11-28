import {
	buildIcrcCustomTokens,
	buildIndexedIcrcCustomTokens
} from '$icp/services/icrc-custom-tokens.services';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutIdExtended } from '$icp/types/icrc-custom-token';

export const SNS_BUILTIN_TOKENS: IcTokenWithoutIdExtended[] = buildIcrcCustomTokens();

export const SNS_BUILTIN_TOKENS_INDEXED: Record<LedgerCanisterIdText, IcTokenWithoutIdExtended> =
	buildIndexedIcrcCustomTokens(SNS_BUILTIN_TOKENS);

export const GOLDAO_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	SNS_BUILTIN_TOKENS.find((t) => t.symbol === 'GOLDAO')?.ledgerCanisterId ??
	'tyyy3-4aaaa-aaaaq-aab7a-cai';
