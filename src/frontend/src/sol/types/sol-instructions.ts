import type { SolAddress } from '$lib/types/address';
import type { SolRpcTransactionRaw } from '$sol/types/sol-transaction';
import type { ParsedComputeBudgetInstruction } from '@solana-program/compute-budget';
import type { ParsedSystemInstruction } from '@solana-program/system';
import type { ParsedTokenInstruction } from '@solana-program/token';
import type { Address, CompilableTransactionMessage } from '@solana/kit';

export type SolParsedComputeBudgetInstruction = ParsedComputeBudgetInstruction<SolAddress>;
export type SolParsedSystemInstruction = ParsedSystemInstruction<SolAddress>;
export type SolParsedTokenInstruction = ParsedTokenInstruction<SolAddress>;

export type SolParsedInstruction =
	| SolParsedComputeBudgetInstruction
	| SolParsedSystemInstruction
	| SolParsedTokenInstruction;

export type SolInstruction = CompilableTransactionMessage['instructions'][number];

export type SolRpcInstruction =
	NonNullable<SolRpcTransactionRaw>['transaction']['message']['instructions'][number] & {
		programAddress: Address;
	};
