import { CKSOL_ENABLED } from '$env/cksol.env';
import { SOL_TOKEN_GROUP } from '$env/tokens/groups/groups.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { IcCkInterface } from '$icp/types/ic-token';
import { BETA, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText } from '$lib/types/canister';
import { nonNullish } from '@dfinity/utils';

export const IC_CKSOL_LEDGER_CANISTER_ID: CanisterIdText = 'ls5lp-lqaaa-aaaar-qb5oa-cai';

export const IC_CKSOL_INDEX_CANISTER_ID: CanisterIdText = '2ezyf-hqaaa-aaaar-qb6ga-cai';

export const IC_CKSOL_MINTER_CANISTER_ID: CanisterIdText = 'lh22c-kyaaa-aaaar-qb5nq-cai';

// Mainnet only. A local build reaches no mainnet canister, and the Devnet suite
// (ckDevnetSOL) is left out because Chain Fusion only converts mainnet pairs.
export const CKSOL_IC_DATA: IcCkInterface | undefined =
	CKSOL_ENABLED && (STAGING || BETA || PROD)
		? {
				ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKSOL_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID,
				exchangeCoinId: 'solana',
				twinToken: SOLANA_TOKEN,
				groupData: SOL_TOKEN_GROUP
			}
		: undefined;

export const ICRC_CK_SOL_TOKENS: IcCkInterface[] = nonNullish(CKSOL_IC_DATA) ? [CKSOL_IC_DATA] : [];
