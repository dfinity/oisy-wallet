import type { CustomToken as BackendCustomToken } from '$declarations/backend/backend.did';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
import type { CustomToken } from '$lib/types/custom-token';
import type { Nullish } from '@dfinity/zod-schemas';

export type IcrcCustomToken = CustomToken<IcToken>;

export type OptionIcrcCustomToken = Nullish<IcrcCustomToken>;

// A saved ICRC token OISY skips or cannot load, kept with its saved entry so the user can delete it.
export interface IcrcUnavailableCustomToken {
	ledgerCanisterId: LedgerCanisterIdText;
	// The symbol of a token OISY lists. An imported or retired token has none.
	symbol?: string;
	customToken: BackendCustomToken;
}
