import { ZERO } from '$lib/constants/app.constants';
import type { SolTransactionMessage } from '$sol/types/sol-send';
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

export const mapSolTransactionMessage = ({
	instructions
}: TransactionMessage): MappedSolTransaction =>
	Array.from(instructions).reduce<MappedSolTransaction>(
		(acc, instruction) => {
			const { amount, source, destination, payer } = mapSolInstruction(instruction);

			return {
				...acc,
				amount: nonNullish(amount) ? (acc.amount ?? ZERO) + amount : acc.amount,
				...(nonNullish(source) && { source }),
				...(nonNullish(destination) && { destination }),
				...(nonNullish(payer) && { payer })
			};
		},
		{ amount: undefined }
	);

export const transactionMessageHasBlockhashLifetime = (
	message: CompilableTransactionMessage
): message is SolTransactionMessage =>
	'blockhash' in message.lifetimeConstraint && 'lastValidBlockHeight' in message.lifetimeConstraint;
