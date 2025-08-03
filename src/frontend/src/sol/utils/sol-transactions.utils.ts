import { ZERO } from '$lib/constants/app.constants';
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { MappedSolTransaction, SolRpcTransaction } from '$sol/types/sol-transaction';
import { mapSolInstruction, parseSolInstruction } from '$sol/utils/sol-instructions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { ComputeBudgetInstruction } from '@solana-program/compute-budget';
import {
	AccountRole,
	decompileTransactionMessageFetchingLookupTables,
	getBase58Encoder,
	getBase64Encoder,
	getCompiledTransactionMessageDecoder,
	getTransactionDecoder,
	lamports,
	type CompilableTransactionMessage,
	type Lamports,
	type MicroLamports,
	type Rpc,
	type SolanaRpcApi,
	type Transaction,
	type TransactionMessage
} from '@solana/kit';

export const decodeTransactionMessage = (transactionMessage: string): Transaction => {
	const transactionBytes = getBase64Encoder().encode(transactionMessage);
	return getTransactionDecoder().decode(transactionBytes);
};

/**
 * It parses a base64 encoded transaction message into a compilable transaction message with lookup tables and instruction
 */
export const parseSolBase64TransactionMessage = async ({
	transactionMessage,
	rpc
}: {
	transactionMessage: string;
	rpc: Rpc<SolanaRpcApi>;
}): Promise<CompilableTransactionMessage> => {
	const { messageBytes } = decodeTransactionMessage(transactionMessage);
	const compiledTransactionMessage = getCompiledTransactionMessageDecoder().decode(messageBytes);
	return await decompileTransactionMessageFetchingLookupTables(compiledTransactionMessage, rpc);
};

export const mapSolTransactionMessage = ({
	instructions
}: TransactionMessage): MappedSolTransaction =>
	Array.from(instructions).reduce<MappedSolTransaction>(
		(acc, instruction) => {
			const { amount, source, destination, payer } = mapSolInstruction(instruction);

			return {
				...acc,
				amount: nonNullish(amount) ? (acc.amount ?? ZERO) + amount : acc.amount,
				source,
				destination,
				payer
			};
		},
		{ amount: undefined }
	);

export const transactionMessageHasBlockhashLifetime = (
	message: CompilableTransactionMessage
): message is SolTransactionMessage =>
	'blockhash' in message.lifetimeConstraint && 'lastValidBlockHeight' in message.lifetimeConstraint;

export const extractPriorityFee = async (
	transactionDetail: SolRpcTransaction
): Promise<Lamports | undefined> => {
	const {
		transaction: {
			message: { instructions }
		},
		meta
	} = transactionDetail;

	const { computeUnitsConsumed } = meta ?? {};

	const filteredInstructions = instructions.filter(
		(instruction) => instruction.programId === COMPUTE_BUDGET_PROGRAM_ADDRESS
	);

	const computeUnitPrice = await filteredInstructions.reduce<Promise<MicroLamports | undefined>>(
		async (acc, instruction): Promise<MicroLamports | undefined> => {
			const accPrice = await acc;

			if (nonNullish(accPrice)) {
				return acc;
			}

			if ('parsed' in instruction) {
				const {
					parsed: { type, info }
				} = instruction;

				if (type !== 'setComputeUnitPrice') {
					return acc;
				}

				// We need to cast the type since it is not implied
				const { microLamports: computeUnitPrice } = info as {
					microLamports: MicroLamports;
				};

				return computeUnitPrice;
			}

			const parsedInstruction = nonNullish(instruction.data)
				? parseSolInstruction({
						...instruction,
						programAddress: instruction.programId,
						data: getBase58Encoder().encode(instruction.data),
						accounts: instruction.accounts.map((address) => ({
							address,
							role: AccountRole.READONLY
						}))
					} as SolInstruction)
				: undefined;

			if (isNullish(parsedInstruction)) {
				return acc;
			}

			if (!('instructionType' in parsedInstruction)) {
				return acc;
			}

			const { instructionType } = parsedInstruction;

			if (instructionType !== ComputeBudgetInstruction.SetComputeUnitPrice) {
				return acc;
			}

			const {
				data: { microLamports: computeUnitPrice }
			} = parsedInstruction;

			return computeUnitPrice as MicroLamports;
		},
		Promise.resolve(undefined)
	);

	if (isNullish(computeUnitPrice) || isNullish(computeUnitsConsumed)) {
		return;
	}

	return lamports((computeUnitsConsumed * computeUnitPrice) / 1_000_000n);
};
