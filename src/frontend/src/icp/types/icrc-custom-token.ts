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
	// The symbol and name of a token OISY lists or once listed. An imported token has neither.
	symbol?: string;
	name?: string;
	customToken: BackendCustomToken;
}

// What the ledger canister of an unavailable token answers when the Help page checks it.
export type IcrcLedgerStatus =
	| { status: 'responding' | 'no_ledger' | 'not_responding' }
	// The IC error code (e.g. IC0536), when the replica names one.
	| { status: 'error'; errorCode?: string };
