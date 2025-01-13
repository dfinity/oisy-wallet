export const SOLANA_DERIVATION_PATH_PREFIX = 'SOL';

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';

export const SYSTEM_ACCOUNT_KEYS = [SYSTEM_PROGRAM_ID, COMPUTE_BUDGET_PROGRAM_ID];

export const TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// Solana transaction fee
// It can be hard-coded since it is not changed unsless under community proposal, with time in advance.
// https://solana.com/docs/core/fees#transaction-fees
export const SOLANA_TRANSACTION_FEE_IN_LAMPORTS = 5000n;
