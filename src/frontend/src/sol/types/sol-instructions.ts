import type { SolAddress } from '$lib/types/address';
import type { SolRpcTransactionRaw } from '$sol/types/sol-transaction';
import type { ParsedComputeBudgetInstruction } from '@solana-program/compute-budget';
import type { ParsedSystemInstruction } from '@solana-program/system';
import type { ParsedTokenInstruction } from '@solana-program/token';
import type { ParsedToken2022Instruction } from '@solana-program/token-2022';
import type { Address, Instruction } from '@solana/kit';

export type SolParsedComputeBudgetInstruction = ParsedComputeBudgetInstruction<SolAddress>;
export type SolParsedSystemInstruction = ParsedSystemInstruction<SolAddress>;
export type SolParsedTokenInstruction = ParsedTokenInstruction<SolAddress>;
export type SolParsedToken2022Instruction = ParsedToken2022Instruction<SolAddress>;

export type SolParsedInstruction =
	| SolParsedComputeBudgetInstruction
	| SolParsedSystemInstruction
	| SolParsedTokenInstruction
	| SolParsedToken2022Instruction;

export type SolInstruction = Instruction;

export type SolRpcInstruction =
	NonNullable<SolRpcTransactionRaw>['transaction']['message']['instructions'][number] & {
		programAddress: Address;
	};
