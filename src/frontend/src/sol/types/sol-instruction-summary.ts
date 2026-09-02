import type { SolAddress } from '$sol/types/address';
import type { SplTokenAddress } from '$sol/types/spl';

/**
 * What one instruction does to the accounts the user owns, in the terms a user thinks in.
 *
 * These are effects, not Solana instruction names. `wrap` and `unwrap` have no instruction of
 * their own, `createTokenAccount` stands for four, and the instruction set's own vocabulary
 * (`syncNative`, `initializeImmutableOwner`) names nothing a user holds or controls.
 */
export type SolInstructionSummaryKind =
	// Not an instruction at all: the container the legs of one routed swap hang under.
	| 'route'
	| 'send'
	| 'receive'
	| 'wrap'
	| 'unwrap'
	| 'createTokenAccount'
	| 'closeTokenAccount'
	| 'approve'
	| 'revoke'
	| 'setAuthority'
	// An instruction the wallet cannot read. It names the program and says nothing about what the
	// call does, which is still worth a line: an instruction left out of the list is one the user
	// has no way of knowing is there.
	| 'unknown';

/**
 * One line of the review's instruction list.
 *
 * Deliberately free of copy: the derivation says what happened, the component says it in the
 * user's language. Amounts stay `bigint` in their base units for the same reason.
 */
export interface SolInstructionSummary {
	kind: SolInstructionSummaryKind;
	amount?: bigint;
	// Absent for native SOL. A mint the wallet cannot name is still carried, so the component can
	// mark it rather than pass it off as a ticker.
	tokenAddress?: SplTokenAddress;
	decimals?: number;
	// The other side of a transfer, or the delegate of an approval.
	counterparty?: SolAddress;
	// Whether the counterparty is an account the user owns. A swap pays the user's own account, so
	// without this every route reads as if it were sending value to a stranger.
	own?: boolean;
	// The account created, closed, approved or handed over.
	account?: SolAddress;
	// Lamports the user pays to open an account.
	rent?: bigint;
	// Lamports an account returns when it is closed. Closing hands the destination the account's
	// whole balance, so for a wrapped SOL account this is the rent-exempt reserve plus the SOL that
	// was wrapped, not the rent alone.
	returned?: bigint;
	// The new authority of a `setAuthority`, absent when the field was cleared.
	newAuthority?: SolAddress;
	// The program that produced the legs of a route, when one is known by address.
	program?: SolAddress;
	// The name that program publishes for itself, when it publishes one. Its own claim about
	// itself, attested by nobody: a label for the address, never a statement about what it does.
	programName?: string;
	// The legs of a single routed swap. They hang under the route rather than sitting flat among
	// the top-level effects, which is what keeps a four-leg route from reading as four unrelated
	// transfers.
	children?: SolInstructionSummary[];
}
