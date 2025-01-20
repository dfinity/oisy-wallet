import type { SolAddress } from '$lib/types/address';
import { SYSTEM_ACCOUNT_KEYS, SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import { parseSolInstruction } from '$sol/utils/sol-instructions.utils';
import { SystemInstruction } from '@solana-program/system';
import { address as solAddress } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type {
	CompilableTransactionMessage,
	TransactionMessage
} from '@solana/transaction-messages';
import { getTransactionDecoder, type Transaction } from '@solana/transactions';
import {
	decompileTransactionMessageFetchingLookupTables,
	getBase64Encoder,
	getCompiledTransactionMessageDecoder
} from '@solana/web3.js';
import { getBase64Encoder } from '@solana/codecs';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import {
	getCompiledTransactionMessageDecoder,
	type CompilableTransactionMessage
} from '@solana/transaction-messages';
import { getTransactionDecoder, type Transaction } from '@solana/transactions';
import { decompileTransactionMessageFetchingLookupTables } from '@solana/web3.js';

interface TransactionWithAddress {
	transaction: SolRpcTransaction;
	address: SolAddress;
}

export const getSolBalanceChange = ({ transaction, address }: TransactionWithAddress) => {
	const {
		transaction: {
			message: { accountKeys }
		},
		meta
	} = transaction;

	const accountIndex = accountKeys.indexOf(solAddress(address));
	const { preBalances, postBalances } = meta ?? {};

	return (postBalances?.[accountIndex] ?? 0n) - (preBalances?.[accountIndex] ?? 0n);
};

/**
 * It maps a transaction to a Solana transaction UI object
 */
export const mapSolTransactionUi = ({
	transaction,
	address
}: TransactionWithAddress): SolTransactionUi => {
	const {
		id,
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { accountKeys }
		},
		meta
	} = transaction;

	const nonSystemAccountKeys = accountKeys.filter((key) => !SYSTEM_ACCOUNT_KEYS.includes(key));

	const from = accountKeys[0];
	//edge-case: transaction from my wallet, to my wallet
	const to = nonSystemAccountKeys.length === 1 ? nonSystemAccountKeys[0] : accountKeys[1];

	const { fee } = meta ?? {};

	const relevantFee = from === address ? (fee ?? 0n) : 0n;

	const amount = getSolBalanceChange({ transaction, address }) + relevantFee;

	const type = amount > 0n ? 'receive' : 'send';

	return {
		id,
		timestamp: blockTime ?? 0n,
		from,
		to,
		type,
		status,
		value: amount,
		fee
	};
};

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
}: TransactionMessage): {
	amount: bigint;
	payer?: SolAddress;
	source?: SolAddress;
	destination?: SolAddress;
} =>
	Array.from(instructions).reduce<{
		amount: bigint;
		payer?: SolAddress;
		source?: SolAddress;
		destination?: SolAddress;
	}>(
		(acc, instruction) => {
			const parsedInstruction = parseSolInstruction(instruction);

			console.log('parsedInstruction', parsedInstruction);

			if (!('instructionType' in parsedInstruction)) {
				return acc;
			}

			const { programAddress } = parsedInstruction;

			if (programAddress !== SYSTEM_PROGRAM_ADDRESS) {
				return acc;
			}

			const { instructionType, data } = parsedInstruction;

			if (instructionType === SystemInstruction.CreateAccount) {
				const { lamports } = data;
				const {
					accounts: {
						payer: { address: payer }
					}
				} = parsedInstruction;

				return {
					...acc,
					amount: (acc.amount ?? 0n) + lamports,
					payer
				};
			}

			if (instructionType === SystemInstruction.TransferSol) {
				const { amount } = data;
				const {
					accounts: {
						source: { address: source },
						destination: { address: destination }
					}
				} = parsedInstruction;

				return {
					...acc,
					amount: (acc.amount ?? 0n) + amount,
					source,
					destination
				};
			}

			return acc;
		},
		{ amount: 0n, payer: undefined, source: undefined, destination: undefined }
	);

export const transactionMessageHasBlockhashLifetime = (
	message: CompilableTransactionMessage
): message is SolTransactionMessage =>
	'blockhash' in message.lifetimeConstraint && 'lastValidBlockHeight' in message.lifetimeConstraint;
