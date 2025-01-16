import type { SolAddress } from '$lib/types/address';
import { SYSTEM_ACCOUNT_KEYS } from '$sol/constants/sol.constants';
import type {
	SolInstruction,
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
	parseWithdrawNonceAccountInstruction,
	type ParsedSystemInstruction
} from '@solana-program/system';
import { address as solAddress } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { CompiledTransactionMessage, TransactionMessage } from '@solana/transaction-messages';
import { getTransactionDecoder } from '@solana/transactions';
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
): {
	instruction: SolInstruction | ParsedSystemInstruction;
	instructionType: SystemInstruction | undefined;
} => {
	try {
		const decodedInstruction = identifySystemInstruction(instruction);
		switch (decodedInstruction) {
			case SystemInstruction.CreateAccount:
				return {
					instruction: parseCreateAccountInstruction(instruction),
					instructionType: SystemInstruction.CreateAccount
				};
			case SystemInstruction.Assign:
				return {
					instruction: parseAssignInstruction(instruction),
					instructionType: SystemInstruction.Assign
				};
			case SystemInstruction.TransferSol:
				return {
					instruction: parseTransferSolInstruction(instruction),
					instructionType: SystemInstruction.TransferSol
				};
			case SystemInstruction.CreateAccountWithSeed:
				return {
					instruction: parseCreateAccountWithSeedInstruction(instruction),
					instructionType: SystemInstruction.CreateAccountWithSeed
				};
			case SystemInstruction.AdvanceNonceAccount:
				return {
					instruction: parseAdvanceNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.AdvanceNonceAccount
				};
			case SystemInstruction.WithdrawNonceAccount:
				return {
					instruction: parseWithdrawNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.WithdrawNonceAccount
				};
			case SystemInstruction.InitializeNonceAccount:
				return {
					instruction: parseInitializeNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.InitializeNonceAccount
				};
			case SystemInstruction.AuthorizeNonceAccount:
				return {
					instruction: parseAuthorizeNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.AuthorizeNonceAccount
				};
			case SystemInstruction.Allocate:
				return {
					instruction: parseAllocateInstruction(instruction),
					instructionType: SystemInstruction.Allocate
				};
			case SystemInstruction.AllocateWithSeed:
				return {
					instruction: parseAllocateWithSeedInstruction(instruction),
					instructionType: SystemInstruction.AllocateWithSeed
				};
			case SystemInstruction.AssignWithSeed:
				return {
					instruction: parseAssignWithSeedInstruction(instruction),
					instructionType: SystemInstruction.AssignWithSeed
				};
			case SystemInstruction.TransferSolWithSeed:
				return {
					instruction: parseTransferSolWithSeedInstruction(instruction),
					instructionType: SystemInstruction.TransferSolWithSeed
				};
			case SystemInstruction.UpgradeNonceAccount:
				return {
					instruction: parseUpgradeNonceAccountInstruction(instruction),
					instructionType: SystemInstruction.UpgradeNonceAccount
				};
			default:
				// If the instruction is not a system instruction, we are unable to parse it, so we return it as is
				return { instruction, instructionType: undefined };
		}
	} catch (_: unknown) {
		// If the instruction is not a system instruction, we are unable to parse it, so we return it as is
		return { instruction, instructionType: undefined };
	}
};

export const parseSolTransactionMessage = async ({
	transactionMessage,
	rpc
}: {
	transactionMessage: CompiledTransactionMessage;
	rpc: Rpc<SolanaRpcApi>;
}): Promise<TransactionMessage> => {
	const decompiledTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
		transactionMessage,
		rpc
	);

	return {
		...decompiledTransactionMessage,
		instructions: decompiledTransactionMessage.instructions.map(
			(instruction) => parseSolInstruction(instruction).instruction
		)
	};
};

export const parseSolBase64TransactionMessage = async ({
	transactionMessage,
	rpc
}: {
	transactionMessage: string;
	rpc: Rpc<SolanaRpcApi>;
}): Promise<TransactionMessage> => {
	const transactionBytes = getBase64Encoder().encode(transactionMessage);
	const { messageBytes } = getTransactionDecoder().decode(transactionBytes);
	const compiledTransactionMessage = getCompiledTransactionMessageDecoder().decode(messageBytes);
	return await parseSolTransactionMessage({
		transactionMessage: compiledTransactionMessage,
		rpc
	});
};
