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

// Above this, the prioritisation fee stops looking like a congestion tip and starts looking
// like the real cost of the transaction, so the review calls it out explicitly. Typical
// mainnet tips sit three orders of magnitude below it.
export const SOLANA_HIGH_PRIORITIZATION_FEE_IN_LAMPORTS = 10_000_000n;
