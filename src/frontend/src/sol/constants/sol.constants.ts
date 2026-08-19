export const SOLANA_DERIVATION_PATH_PREFIX = 'SOL';

export const SYSTEM_PROGRAM_ADDRESS = '11111111111111111111111111111111';
export const COMPUTE_BUDGET_PROGRAM_ADDRESS = 'ComputeBudget111111111111111111111111111111';
export const TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ADDRESS = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS =
	'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

// Solana transaction fee
// It can be hard-coded since it is not changed unsless under community proposal, with time in advance.
// https://solana.com/docs/core/fees#transaction-fees
export const SOLANA_TRANSACTION_FEE_IN_LAMPORTS = 5_000n;

export const MICROLAMPORTS_PER_LAMPORT = 1_000_000n;

// When a transaction does not request a compute unit limit, the runtime budgets a fixed
// amount per instruction, capped transaction-wide. The prioritisation fee is charged on the
// requested (or defaulted) limit, not on the units actually consumed.
// https://solana.com/docs/core/fees#compute-unit-limit
export const SOLANA_DEFAULT_COMPUTE_UNIT_LIMIT_PER_INSTRUCTION = 200_000n;
export const SOLANA_MAX_COMPUTE_UNIT_LIMIT = 1_400_000n;

// A prioritisation fee is only meaningful next to what the same transaction *should* cost, so the
// review judges it against a baseline: the larger of this fiat floor and what OISY itself would
// pay right now. The floor keeps the baseline honest when the network is quiet and its estimate
// collapses towards nothing, which would otherwise make an ordinary tip look enormous.
export const SOLANA_PRIORITIZATION_FEE_BASELINE_FLOOR_USD = 0.1;

// The simulated preview asks the RPC for the post-state of an explicit list of accounts. Only
// writable accounts can change, which already discards most of a DeFi message's account set;
// past this many the preview is dropped rather than truncated, because a truncated preview
// would report "no changes" for accounts it never looked at.
export const SOLANA_SIMULATION_MAX_ACCOUNTS = 60;

// The preview is fetched before the review renders, so a slow or unresponsive RPC would hold
// the request behind it. Past this it is abandoned and the review renders without it.
export const SOLANA_SIMULATION_TIMEOUT_MILLISECONDS = 5_000;

// Multiples of that baseline at which the review speaks up: twice it is worth naming as the dApp's
// own choice, five times it is worth questioning. Both stay short of blocking, since paying well
// over the odds is a legitimate thing to want during congestion.
export const SOLANA_PRIORITIZATION_FEE_NOTICE_MULTIPLIER = 2n;
export const SOLANA_PRIORITIZATION_FEE_WARNING_MULTIPLIER = 5n;

// What it costs to open an SPL token account, and it is refunded when the account is closed. A
// transfer to someone who has no account for that token pays this so the tokens have somewhere to
// land, which is why it shows up beside real payments and is not one.
export const SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280n;

/**
 * The programs worth naming, by the name a person would recognise.
 *
 * Deliberately short. A wrong label on a program is worse than none, because "on Raydium" reads as
 * a fact rather than a guess, so only programs whose identity is not in doubt are listed here.
 * Anything else keeps its address, which is at least checkable.
 */
export const SOLANA_PROGRAM_NAMES: Record<string, string> = {
	'11111111111111111111111111111111': 'the System program',
	ComputeBudget111111111111111111111111111111: 'the Compute Budget program',
	TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'the Token program',
	TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: 'the Token-2022 program',
	ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: 'the Associated Token program',
	MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: 'the Memo program',
	Stake11111111111111111111111111111111111111: 'the Stake program',
	Vote111111111111111111111111111111111111111: 'the Vote program',
	JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter',
	'675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium',
	whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca',
	dahPEoZGXfyV58JqqH85okdHmpN8U2q8owgPUXSCPxe: 'Omni Bridge'
};

// The programs every Solana transaction is made of. Naming them says nothing about what happened,
// so they are left out of the ones the sentence may mention.
export const SOLANA_PLUMBING_PROGRAMS = [
	'11111111111111111111111111111111',
	'ComputeBudget111111111111111111111111111111',
	'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
	'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
	'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
];
