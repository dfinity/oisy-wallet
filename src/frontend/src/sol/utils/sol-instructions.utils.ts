import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { getAccountInfo } from '$sol/api/solana.api';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import type {
	SolInstruction,
	SolParsedComputeBudgetInstruction,
	SolParsedInstruction,
	SolParsedSystemInstruction,
	SolParsedTokenInstruction,
	SolRpcInstruction
} from '$sol/types/sol-instructions';
import type { MappedSolTransaction, SolMappedTransaction } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { parseSolToken2022Instruction } from '$sol/utils/sol-instructions-token-2022.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	ComputeBudgetInstruction,
	identifyComputeBudgetInstruction,
	parseRequestHeapFrameInstruction,
	parseRequestUnitsInstruction,
	parseSetComputeUnitLimitInstruction,
	parseSetComputeUnitPriceInstruction,
	parseSetLoadedAccountsDataSizeLimitInstruction
} from '@solana-program/compute-budget';
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
import {
	TokenInstruction,
	identifyTokenInstruction,
	parseAmountToUiAmountInstruction,
	parseApproveCheckedInstruction,
	parseApproveInstruction,
	parseBurnCheckedInstruction,
	parseBurnInstruction,
	parseCloseAccountInstruction,
	parseFreezeAccountInstruction,
	parseGetAccountDataSizeInstruction,
	parseInitializeAccount2Instruction,
	parseInitializeAccount3Instruction,
	parseInitializeAccountInstruction,
	parseInitializeImmutableOwnerInstruction,
	parseInitializeMint2Instruction,
	parseInitializeMintInstruction,
	parseInitializeMultisig2Instruction,
	parseInitializeMultisigInstruction,
	parseMintToCheckedInstruction,
	parseMintToInstruction,
	parseRevokeInstruction,
	parseSetAuthorityInstruction,
	parseSyncNativeInstruction,
	parseThawAccountInstruction,
	parseTransferCheckedInstruction,
	parseTransferInstruction,
	parseUiAmountToAmountInstruction
} from '@solana-program/token';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

const mapSystemParsedInstruction = ({
	type,
	info
}: {
	type: string;
	info: object;
}): SolMappedTransaction | undefined => {
	if (type === 'createAccount') {
		// We need to cast the type since it is not implied
		const {
			source: from,
			newAccount: to,
			lamports: value
		} = info as {
			source: SolAddress;
			newAccount: SolAddress;
			lamports: bigint;
		};

		return { value, from, to };
	}

	if (type === 'transfer') {
		// We need to cast the type since it is not implied
		const {
			destination: to,
			lamports: value,
			source: from
		} = info as {
			destination: SolAddress;
			lamports: bigint;
			source: SolAddress;
		};

		return { value, from, to };
	}
};

const mapTokenParsedInstruction = async ({
	type,
	info,
	network,
	cumulativeBalances,
	addressToToken
}: {
	identity: OptionIdentity;
	type: string;
	info: object;
	network: SolanaNetworkType;
	cumulativeBalances?: Record<SolAddress, SolMappedTransaction['value']>;
	addressToToken?: Record<SolAddress, SplTokenAddress>;
}): Promise<SolMappedTransaction | undefined> => {
	if (type === 'transfer') {
		// We need to cast the type since it is not implied
		const {
			destination: to,
			amount: value,
			source: from
		} = info as {
			destination: SolAddress;
			amount: string;
			source: SolAddress;
		};

		const tokenAddress = addressToToken?.[from] ?? addressToToken?.[to];

		if (nonNullish(tokenAddress)) {
			return { value: BigInt(value), from, to, tokenAddress };
		}

		const { value: sourceResult } = await getAccountInfo({ address: from, network });

		if (nonNullish(sourceResult) && 'parsed' in sourceResult.data) {
			const {
				data: {
					parsed: { info: sourceInfo }
				}
			} = sourceResult;

			const { mint: tokenAddress } = sourceInfo as { mint: SplTokenAddress };

			return { value: BigInt(value), from, to, tokenAddress };
		}

		const { value: destinationResult } = await getAccountInfo({ address: to, network });

		if (nonNullish(destinationResult) && 'parsed' in destinationResult.data) {
			const {
				data: {
					parsed: { info: destinationInfo }
				}
			} = destinationResult;

			const { mint: tokenAddress } = destinationInfo as { mint: SplTokenAddress };

			return { value: BigInt(value), from, to, tokenAddress };
		}
	}

	if (type === 'transferChecked') {
		// We need to cast the type since it is not implied
		const {
			destination: to,
			tokenAmount: { amount: value },
			source: from,
			mint: tokenAddress
		} = info as {
			destination: SolAddress;
			tokenAmount: { amount: string };
			source: SolAddress;
			mint: SplTokenAddress;
		};

		return { value: BigInt(value), from, to, tokenAddress };
	}

	if (type === 'closeAccount') {
		// We need to cast the type since it is not implied
		const { destination: to, account: from } = info as {
			destination: SolAddress;
			account: SolAddress;
		};

		// In case of `closeAccount` transaction we take the accumulated balance of SOL (or WSOL) of the Associated Token Account (this is the `from` address).
		// We do this because the entire amount of SOL (or WSOL) is redeemed by the owner of the ATA.
		const value = cumulativeBalances?.[from] ?? ZERO;

		return { value, from, to };
	}

	if (type === 'mintTo') {
		// We need to cast the type since it is not implied
		const {
			account: to,
			mint: tokenAddress,
			amount: value
		} = info as {
			account: SolAddress;
			mint: SplTokenAddress;
			amount: string;
		};

		// For a mint transaction, we consider the token as the source of the transaction
		return { value: BigInt(value), from: tokenAddress, to, tokenAddress };
	}

	if (type === 'burn') {
		// We need to cast the type since it is not implied
		const {
			account: from,
			mint: tokenAddress,
			amount: value
		} = info as {
			account: SolAddress;
			mint: SplTokenAddress;
			amount: string;
		};

		// For a burn transaction, we consider the token as the destination of the transaction
		return { value: BigInt(value), from, to: tokenAddress, tokenAddress };
	}

	if (type === 'mintToChecked') {
		// We need to cast the type since it is not implied
		const {
			account: to,
			mint: tokenAddress,
			tokenAmount: { amount: value }
		} = info as {
			account: SolAddress;
			mint: SplTokenAddress;
			tokenAmount: { amount: string };
		};

		// For a mint transaction, we consider the token as the source of the transaction
		return { value: BigInt(value), from: tokenAddress, to, tokenAddress };
	}

	if (type === 'burnChecked') {
		// We need to cast the type since it is not implied
		const {
			account: from,
			mint: tokenAddress,
			tokenAmount: { amount: value }
		} = info as {
			account: SolAddress;
			mint: SplTokenAddress;
			tokenAmount: { amount: string };
		};

		// For a burn transaction, we consider the token as the destination of the transaction
		return { value: BigInt(value), from, to: tokenAddress, tokenAddress };
	}
};

// Solana program Token2022 provides exactly the same instructions as the legacy Token program plus a few more.
// So the implementation of the mapping of the instructions is the same as the legacy Token program for the instructions that are common.
const mapToken2022ParsedInstruction = async ({
	identity,
	type,
	info,
	network,
	cumulativeBalances,
	addressToToken
}: {
	identity: OptionIdentity;
	type: string;
	info: object;
	network: SolanaNetworkType;
	cumulativeBalances?: Record<SolAddress, SolMappedTransaction['value']>;
	addressToToken?: Record<SolAddress, SplTokenAddress>;
}): Promise<SolMappedTransaction | undefined> => {
	if (
		[
			'transfer',
			'transferChecked',
			'closeAccount',
			'mintTo',
			'burn',
			'mintToChecked',
			'burnChecked'
		].includes(type)
	) {
		return await mapTokenParsedInstruction({
			identity,
			type,
			info,
			network,
			cumulativeBalances,
			addressToToken
		});
	}
};

const mapAssociatedTokenAccountInstruction = ({
	type
}: {
	type: string;
}): SolMappedTransaction | undefined => {
	if (type === 'create' || type === 'createIdempotent') {
		// We don't need to map the instruction since it is not relevant for the user
		return;
	}
};

export const mapSolParsedInstruction = async ({
	identity,
	instruction,
	network,
	cumulativeBalances,
	addressToToken
}: {
	identity: OptionIdentity;
	instruction: SolRpcInstruction;
	network: SolanaNetworkType;
	cumulativeBalances?: Record<SolAddress, SolMappedTransaction['value']>;
	addressToToken?: Record<SolAddress, SplTokenAddress>;
}): Promise<SolMappedTransaction | undefined> => {
	if (!('parsed' in instruction)) {
		return;
	}

	const {
		parsed: { type, info },
		programAddress
	} = instruction;

	if (isNullish(info)) {
		return;
	}

	if (programAddress === SYSTEM_PROGRAM_ADDRESS) {
		return mapSystemParsedInstruction({ type, info });
	}

	if (programAddress === TOKEN_PROGRAM_ADDRESS) {
		return await mapTokenParsedInstruction({
			identity,
			type,
			info,
			network,
			cumulativeBalances,
			addressToToken
		});
	}

	if (programAddress === TOKEN_2022_PROGRAM_ADDRESS) {
		return mapToken2022ParsedInstruction({
			identity,
			type,
			info,
			network,
			cumulativeBalances,
			addressToToken
		});
	}

	if (programAddress === ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS) {
		return mapAssociatedTokenAccountInstruction({ type });
	}

	// It is useful to receive feedback when we are not able to map an instruction
	console.warn(
		`Could not map Solana instruction of type ${type} for program ${programAddress}`,
		instruction
	);

	return;
};

const parseSolComputeBudgetInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedComputeBudgetInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);

	const decodedInstruction = identifyComputeBudgetInstruction(instruction);
	switch (decodedInstruction) {
		case ComputeBudgetInstruction.RequestUnits:
			return {
				...parseRequestUnitsInstruction(instruction),
				instructionType: ComputeBudgetInstruction.RequestUnits
			};
		case ComputeBudgetInstruction.RequestHeapFrame:
			return {
				...parseRequestHeapFrameInstruction(instruction),
				instructionType: ComputeBudgetInstruction.RequestHeapFrame
			};
		case ComputeBudgetInstruction.SetComputeUnitLimit:
			return {
				...parseSetComputeUnitLimitInstruction(instruction),
				instructionType: ComputeBudgetInstruction.SetComputeUnitLimit
			};
		case ComputeBudgetInstruction.SetComputeUnitPrice:
			return {
				...parseSetComputeUnitPriceInstruction(instruction),
				instructionType: ComputeBudgetInstruction.SetComputeUnitPrice
			};
		case ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit:
			return {
				...parseSetLoadedAccountsDataSizeLimitInstruction(instruction),
				instructionType: ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit
			};
		default:
			return instruction;
	}
};

const parseSolSystemInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedSystemInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
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
			return instruction;
	}
};

const parseSolTokenInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedTokenInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
	assertIsInstructionWithAccounts(instruction);

	const decodedInstruction = identifyTokenInstruction(instruction);
	switch (decodedInstruction) {
		case TokenInstruction.InitializeMint:
			return {
				...parseInitializeMintInstruction(instruction),
				instructionType: TokenInstruction.InitializeMint
			};
		case TokenInstruction.InitializeAccount:
			return {
				...parseInitializeAccountInstruction(instruction),
				instructionType: TokenInstruction.InitializeAccount
			};
		case TokenInstruction.InitializeMultisig:
			return {
				...parseInitializeMultisigInstruction(instruction),
				instructionType: TokenInstruction.InitializeMultisig
			};
		case TokenInstruction.Transfer:
			return {
				...parseTransferInstruction(instruction),
				instructionType: TokenInstruction.Transfer
			};
		case TokenInstruction.Approve:
			return {
				...parseApproveInstruction(instruction),
				instructionType: TokenInstruction.Approve
			};
		case TokenInstruction.Revoke:
			return {
				...parseRevokeInstruction(instruction),
				instructionType: TokenInstruction.Revoke
			};
		case TokenInstruction.SetAuthority:
			return {
				...parseSetAuthorityInstruction(instruction),
				instructionType: TokenInstruction.SetAuthority
			};
		case TokenInstruction.MintTo:
			return {
				...parseMintToInstruction(instruction),
				instructionType: TokenInstruction.MintTo
			};
		case TokenInstruction.Burn:
			return {
				...parseBurnInstruction(instruction),
				instructionType: TokenInstruction.Burn
			};
		case TokenInstruction.CloseAccount:
			return {
				...parseCloseAccountInstruction(instruction),
				instructionType: TokenInstruction.CloseAccount
			};
		case TokenInstruction.FreezeAccount:
			return {
				...parseFreezeAccountInstruction(instruction),
				instructionType: TokenInstruction.FreezeAccount
			};
		case TokenInstruction.ThawAccount:
			return {
				...parseThawAccountInstruction(instruction),
				instructionType: TokenInstruction.ThawAccount
			};
		case TokenInstruction.TransferChecked:
			return {
				...parseTransferCheckedInstruction(instruction),
				instructionType: TokenInstruction.TransferChecked
			};
		case TokenInstruction.ApproveChecked:
			return {
				...parseApproveCheckedInstruction(instruction),
				instructionType: TokenInstruction.ApproveChecked
			};
		case TokenInstruction.MintToChecked:
			return {
				...parseMintToCheckedInstruction(instruction),
				instructionType: TokenInstruction.MintToChecked
			};
		case TokenInstruction.BurnChecked:
			return {
				...parseBurnCheckedInstruction(instruction),
				instructionType: TokenInstruction.BurnChecked
			};
		case TokenInstruction.InitializeAccount2:
			return {
				...parseInitializeAccount2Instruction(instruction),
				instructionType: TokenInstruction.InitializeAccount2
			};
		case TokenInstruction.SyncNative:
			return {
				...parseSyncNativeInstruction(instruction),
				instructionType: TokenInstruction.SyncNative
			};
		case TokenInstruction.InitializeAccount3:
			return {
				...parseInitializeAccount3Instruction(instruction),
				instructionType: TokenInstruction.InitializeAccount3
			};
		case TokenInstruction.InitializeMultisig2:
			return {
				...parseInitializeMultisig2Instruction(instruction),
				instructionType: TokenInstruction.InitializeMultisig2
			};
		case TokenInstruction.InitializeMint2:
			return {
				...parseInitializeMint2Instruction(instruction),
				instructionType: TokenInstruction.InitializeMint2
			};
		case TokenInstruction.GetAccountDataSize:
			return {
				...parseGetAccountDataSizeInstruction(instruction),
				instructionType: TokenInstruction.GetAccountDataSize
			};
		case TokenInstruction.InitializeImmutableOwner:
			return {
				...parseInitializeImmutableOwnerInstruction(instruction),
				instructionType: TokenInstruction.InitializeImmutableOwner
			};
		case TokenInstruction.AmountToUiAmount:
			return {
				...parseAmountToUiAmountInstruction(instruction),
				instructionType: TokenInstruction.AmountToUiAmount
			};
		case TokenInstruction.UiAmountToAmount:
			return {
				...parseUiAmountToAmountInstruction(instruction),
				instructionType: TokenInstruction.UiAmountToAmount
			};
		default:
			return instruction;
	}
};

/**
 * Parse a Solana instruction according to its program address.
 *
 * Note that we do not map all the instructions, only the ones we are able to get the IDL for.
 *
 * @param instruction - The Solana instruction to parse.
 * @returns The parsed instruction or the original instruction if it could not be parsed.
 */
export const parseSolInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedInstruction => {
	const { programAddress } = instruction;

	if (programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS) {
		return parseSolComputeBudgetInstruction(instruction);
	}

	if (programAddress === SYSTEM_PROGRAM_ADDRESS) {
		return parseSolSystemInstruction(instruction);
	}

	if (programAddress === TOKEN_PROGRAM_ADDRESS) {
		return parseSolTokenInstruction(instruction);
	}

	if (programAddress === TOKEN_2022_PROGRAM_ADDRESS) {
		return parseSolToken2022Instruction(instruction);
	}

	return instruction;
};

const mapSolSystemInstruction = (instruction: SolParsedInstruction): MappedSolTransaction => {
	const { instructionType } = instruction;

	if (instructionType === SystemInstruction.CreateAccount) {
		const {
			data: { lamports },
			accounts: {
				payer: { address: payer }
			}
		} = instruction;

		return {
			amount: lamports,
			payer
		};
	}

	if (instructionType === SystemInstruction.TransferSol) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				destination: { address: destination }
			}
		} = instruction;

		return {
			amount,
			source,
			destination
		};
	}

	return { amount: undefined };
};

// TODO: find a way to map correctly all the transaction message instructions
// TODO: create tests
export const mapSolInstruction = (instruction: SolInstruction): MappedSolTransaction => {
	const parsedInstruction = parseSolInstruction(instruction);

	if (!('instructionType' in parsedInstruction)) {
		return { amount: undefined };
	}

	const { programAddress } = parsedInstruction;

	if (programAddress === SYSTEM_PROGRAM_ADDRESS) {
		return mapSolSystemInstruction(parsedInstruction);
	}

	return { amount: undefined };
};
