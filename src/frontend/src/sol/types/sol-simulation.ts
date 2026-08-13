import type { SolAddress } from '$sol/types/address';
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
