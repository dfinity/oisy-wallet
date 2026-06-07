import { ZERO } from '$lib/constants/app.constants';
import type { OptionSolAddress } from '$sol/types/address';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { mapSolInstruction } from '$sol/utils/sol-instructions.utils';
import { nonNullish } from '@dfinity/utils';
import {
	decompileTransactionMessageFetchingLookupTables,
	getBase64Encoder,
	getCompiledTransactionMessageDecoder,
	getTransactionDecoder,
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

const conflicts = ({
	current,
	next
}: {
	current: OptionSolAddress;
	next: OptionSolAddress;
}): boolean => nonNullish(current) && nonNullish(next) && current !== next;

export const mapSolTransactionMessage = ({
	instructions
}: TransactionMessage): MappedSolTransaction =>
	Array.from(instructions).reduce<MappedSolTransaction>(
		(acc, instruction) => {
			const { amount, source, destination, payer, ambiguous: instructionAmbiguous } =
				mapSolInstruction(instruction);

			// The summary holds a single value per field, so any later instruction that
			// disagrees on source, destination or payer would be silently dropped from the
			// review screen. We flag it instead, leaving it to the signing flow to refuse a
			// transaction it cannot display faithfully.
			const ambiguous =
				(acc.ambiguous ?? false) ||
				(instructionAmbiguous ?? false) ||
				conflicts({ current: acc.source, next: source }) ||
				conflicts({ current: acc.destination, next: destination }) ||
				conflicts({ current: acc.payer, next: payer });

			return {
				...acc,
				amount: nonNullish(amount) ? (acc.amount ?? ZERO) + amount : acc.amount,
				...(nonNullish(source) && { source }),
				...(nonNullish(destination) && { destination }),
				...(nonNullish(payer) && { payer }),
				...(ambiguous && { ambiguous })
			};
		},
		{ amount: undefined }
	);
