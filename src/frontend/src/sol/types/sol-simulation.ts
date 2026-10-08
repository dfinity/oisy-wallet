import type { SolAddress } from '$sol/types/address';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolTransferParties } from '$sol/types/sol-transaction';
import type { SolTransactionSummary } from '$sol/types/sol-transaction-summary';
import type { SplTokenAddress } from '$sol/types/spl';

/**
 * Which control field of an account the user owns changed.
 *
 * `program` is the account-level owner (the program the account is assigned to); the other
 * three live inside a parsed SPL token account. They are kept apart because they hand over
 * different things: the account itself, the right to spend from it, or the right to close it.
 */
export type SolSimulationControlField = 'owner' | 'delegate' | 'closeAuthority' | 'program';

export interface SolSimulationTokenDelta {
	account: SolAddress;
	tokenAddress: SplTokenAddress;
	decimals: number;
	delta: bigint;
}

export interface SolSimulationControlChange {
	account: SolAddress;
	field: SolSimulationControlField;
	// Absent when the field was cleared (e.g. a revoked delegate).
	to?: SolAddress;
}

/**
 * What a simulation says this message would do to the accounts the user owns.
 *
 * A control change carries no amount, which is the whole reason it is reported separately: an
 * account handed to someone else keeps the exact balance it had, so a diff of amounts alone
 * would describe the theft as nothing happening.
 */
export interface SolSimulationPreview {
	solDelta?: bigint;
	tokenDeltas: SolSimulationTokenDelta[];
	controlChanges: SolSimulationControlChange[];
}

/**
 * An account an application's program held before a simulated run and emptied in it, with every
 * lamport it held then.
 */
export interface SolClosedAccount {
	account: SolAddress;
	program: SolAddress;
	lamports: bigint;
}

/**
 * A program the simulated run calls from inside another program's instruction and that OISY does
 * not know, with the name it publishes for itself when it publishes one. The name is the program's
 * own claim, attested by nobody: a label for the address, never a statement about what it does.
 */
export interface SolUnreadProgram {
	address: SolAddress;
	name?: string;
}

/**
 * Everything one simulated run yields for the review.
 *
 * The preview is absent when the run changes nothing the user owns; the parties are always
 * present, because a run that produced no transfer at all is itself the answer, and here it is a
 * complete one rather than a gap.
 */
export interface SolSimulationResult {
	preview?: SolSimulationPreview;
	// What the simulated run does to the user's accounts, instruction by instruction. The message
	// states almost none of it: a routed swap performs every transfer as a nested call. Empty when
	// the run did nothing there is a line for, which is an answer rather than a gap.
	instructions?: SolInstructionSummary[];
	// What the message itself says it moves, read from its own top-level instructions rather than
	// from the run. Whether the run agrees is the caller's to decide, since only the caller knows
	// what the transaction costs, which the simulated balance carries and the message never states.
	messageSummary?: SolTransactionSummary;
	// Whether the run opens an account inside another program's instruction with more than its size
	// costs: a payment the review refuses rather than states, as it does for the message's own.
	opensAccountBeyondRent?: boolean;
	parties: SolTransferParties;
	// The programs the run calls from inside another program's instruction that are not among the
	// known ones. Such a call can act on what the user holds in an application, which neither the
	// preview nor the instructions describe. Empty when every nested call reaches a known program.
	unreadPrograms: SolAddress[];
}
