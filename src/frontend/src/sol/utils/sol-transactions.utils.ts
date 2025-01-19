import type { SolAddress } from '$lib/types/address';
import { SYSTEM_ACCOUNT_KEYS } from '$sol/constants/sol.constants';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type {
	SolInstruction,
	SolParsedSystemInstruction,
	SolRpcTransaction,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import {
	SystemInstruction,
	identifySystemInstruction,
	parseAdvanceNonceAccountInstruction,
	parseAllocateInstruction,
	parseAllocateWithSeedInstruction,
	parseAssignInstruction,
	parseAssignWithSeedInstruction,
	parseAuthorizeNonceAccountInstruction,
	parseCreateAccountInstruction,
	parseCreateAccountWithSeedInstruction,
	parseInitializeNonceAccountInstruction,
	parseTransferSolInstruction,
	parseTransferSolWithSeedInstruction,
	parseUpgradeNonceAccountInstruction,
	parseWithdrawNonceAccountInstruction
} from '@solana-program/system';
import { address as solAddress } from '@solana/addresses';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/instructions';
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

export const parseSolInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedSystemInstruction => {
	try {
		assertIsInstructionWithData(instruction);
		assertIsInstructionWithAccounts(instruction);

		const decodedInstruction = identifySystemInstruction(instruction);
		switch (decodedInstruction) {
			case SystemInstruction.CreateAccount:
				return {
					...parseCreateAccountInstruction(instruction),
					instructionType: SystemInstruction.CreateAccount
				};
			case SystemInstruction.Assign:
				return {
					...parseAssignInstruction(instruction),
					instructionType: SystemInstruction.Assign
				};
			case SystemInstruction.TransferSol:
				return {
					...parseTransferSolInstruction(instruction),
					instructionType: SystemInstruction.TransferSol
				};
			case SystemInstruction.CreateAccountWithSeed:
				return {
					...parseCreateAccountWithSeedInstruction(instruction),
					instructionType: SystemInstruction.CreateAccountWithSeed
				};
			case SystemInstruction.AdvanceNonceAccount:
				return {
					...parseAdvanceNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.AdvanceNonceAccount
				};
			case SystemInstruction.WithdrawNonceAccount:
				return {
					...parseWithdrawNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.WithdrawNonceAccount
				};
			case SystemInstruction.InitializeNonceAccount:
				return {
					...parseInitializeNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.InitializeNonceAccount
				};
			case SystemInstruction.AuthorizeNonceAccount:
				return {
					...parseAuthorizeNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.AuthorizeNonceAccount
				};
			case SystemInstruction.Allocate:
				return {
					...parseAllocateInstruction(instruction),
					instructionType: SystemInstruction.Allocate
				};
			case SystemInstruction.AllocateWithSeed:
				return {
					...parseAllocateWithSeedInstruction(instruction),
					instructionType: SystemInstruction.AllocateWithSeed
				};
			case SystemInstruction.AssignWithSeed:
				return {
					...parseAssignWithSeedInstruction(instruction),
					instructionType: SystemInstruction.AssignWithSeed
				};
			case SystemInstruction.TransferSolWithSeed:
				return {
					...parseTransferSolWithSeedInstruction(instruction),
					instructionType: SystemInstruction.TransferSolWithSeed
				};
			case SystemInstruction.UpgradeNonceAccount:
				return {
					...parseUpgradeNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.UpgradeNonceAccount
				};
			default:
				// If the instruction is not a system instruction, we are unable to parse it, so we return it as is
				return instruction;
		}
	} catch (_: unknown) {
		// If the instruction is not a system instruction, we are unable to parse it, so we return it as is
		return instruction;
	}
};

export const decodeTransactionMessage = (transactionMessage: string): Transaction => {
	const transactionBytes = getBase64Encoder().encode(transactionMessage);
	return getTransactionDecoder().decode(transactionBytes);
};

export const parseSolBase64TransactionMessage = async ({
	transactionMessage,
	rpc
}: {
	transactionMessage: string;
	rpc: Rpc<SolanaRpcApi>;
}): Promise<CompilableTransactionMessage> => {
	console.log(
		'transactionMessage',
		transactionMessage,
		decodeTransactionMessage(transactionMessage)
	);
	const { messageBytes } = decodeTransactionMessage(transactionMessage);
	const compiledTransactionMessage = getCompiledTransactionMessageDecoder().decode(messageBytes);
	console.log('compiledTransactionMessage', compiledTransactionMessage);
	return await decompileTransactionMessageFetchingLookupTables(compiledTransactionMessage, rpc);
};

export const mapSolTransactionMessage = (
	transactionMessage: TransactionMessage
): { amount: bigint; payer?: SolAddress; source?: SolAddress; destination?: SolAddress } =>
	Array.from(transactionMessage.instructions).reduce<{
		amount: bigint;
		payer?: SolAddress;
		source?: SolAddress;
		destination?: SolAddress;
	}>(
		(acc, instruction) => {
			const parsedInstruction = parseSolInstruction(instruction);

			console.log('parsedInstruction', parsedInstruction, instruction);

			if (!('instructionType' in parsedInstruction)) {
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
