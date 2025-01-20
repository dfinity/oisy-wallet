import type { SolAddress } from '$lib/types/address';
import type { ParsedComputeBudgetInstruction } from '@solana-program/compute-budget';
import type { ParsedSystemInstruction } from '@solana-program/system';
import type { ParsedTokenInstruction } from '@solana-program/token';
import type { CompilableTransactionMessage } from '@solana/transaction-messages';

export type SolParsedComputeBudgetInstruction = ParsedComputeBudgetInstruction<SolAddress>;
export type SolParsedSystemInstruction = ParsedSystemInstruction<SolAddress>;
export type SolParsedTokenInstruction = ParsedTokenInstruction<SolAddress>;

export type SolInstruction = CompilableTransactionMessage['instructions'][number];
