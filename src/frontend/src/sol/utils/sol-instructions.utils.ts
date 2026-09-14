import { ZERO } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleWarn } from '$lib/utils/console.utils';
import { getAccountInfo } from '$sol/api/solana.api';
import {
	ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	MEMO_LEGACY_PROGRAM_ADDRESS,
	MEMO_PROGRAM_ADDRESS,
	STAKE_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type {
	SolInstruction,
	SolParsedInstruction,
	SolParsedRpcInstruction,
	SolRpcInstruction
} from '$sol/types/sol-instructions';
import type { MappedSolTransaction, SolMappedTransaction } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { parseSolAtaInstruction } from '$sol/utils/sol-instructions-ata.utils';
import { parseSolComputeBudgetInstruction } from '$sol/utils/sol-instructions-compute-budget.utils';
import { parseSolLookupTableInstruction } from '$sol/utils/sol-instructions-lookup-table.utils';
import { parseSolMemoInstruction } from '$sol/utils/sol-instructions-memo.utils';
import { parseSolStakeInstruction } from '$sol/utils/sol-instructions-stake.utils';
import { parseSolSystemInstruction } from '$sol/utils/sol-instructions-system.utils';
import { parseSolToken2022Instruction } from '$sol/utils/sol-instructions-token-2022.utils';
import { parseSolTokenInstruction } from '$sol/utils/sol-instructions-token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { AddressLookupTableInstruction } from '@solana-program/address-lookup-table';
import { ComputeBudgetInstruction } from '@solana-program/compute-budget';
import { StakeInstruction } from '@solana-program/stake';
import { SystemInstruction } from '@solana-program/system';
import { AssociatedTokenInstruction, TokenInstruction } from '@solana-program/token';
import { Token2022Instruction } from '@solana-program/token-2022';
import { type Option, unwrapOption } from '@solana/kit';

const ignoredInstruction = (): MappedSolTransaction => ({ amount: undefined });
const unreviewedInstruction = (): MappedSolTransaction => ({
	amount: undefined,
	unreviewed: true
});
// An undecodable program call merely leaves the review incomplete. These ones are decoded and
// still cannot be stated faithfully, so they fail closed rather than warn: a Compute Budget
// directive we cannot price makes the fee shown provably wrong, and an authority change or a
// burn has no amount/source/destination the single-value summary can carry, so a warning would
// let it ride along invisibly behind a dust transfer the user does see.
const unfaithfulInstruction = (): MappedSolTransaction => ({
	amount: undefined,
	ambiguous: true
});

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
	identity: NullishIdentity;
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

		// In case of `closeAccount` transaction, we take the accumulated balance of SOL (or WSOL) of the Associated Token Account (this is the `from` address).
		// If we don't find the balance, we take the negative of the accumulated balance of the owner of the ATA (this is the `to` address).
		// We do this because the owner of the ATA redeems the entire amount of SOL (or WSOL).
		const value = cumulativeBalances?.[from] ?? -(cumulativeBalances?.[to] ?? ZERO);

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
	identity: NullishIdentity;
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

// This is just a placeholder to "treat" ATA instructions in SOL.
// For now, we don't map any of them because we don't need to.
// It is just for completeness in util `mapSolParsedInstruction` to be aware of this kind of instruction.
const mapAssociatedTokenAccountInstruction = ({
	type
}: {
	type: string;
}): SolMappedTransaction | undefined => {
	if (type === 'create' || type === 'createIdempotent') {
		// We don't need to map the instruction since it is not relevant for the user
		return undefined;
	}
};

export const mapSolParsedInstruction = async ({
	identity,
	instruction,
	network,
	cumulativeBalances,
	addressToToken
}: {
	identity: NullishIdentity;
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
	consoleWarn(
		`Could not map Solana instruction of type ${type} for program ${programAddress}`,
		instruction
	);
};

/**
 * Parse a Solana instruction according to its program address.
 *
 * Note that we do not map all the instructions, only the ones we are able to get the IDL for.
 *
 * @param instruction - The Solana instruction to parse.
 * @returns The parsed instruction or the original instruction if it could not be parsed.
 */
const parseSolInstruction = (
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

	if (programAddress === ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS) {
		return parseSolAtaInstruction(instruction);
	}

	if (programAddress === ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS) {
		return parseSolLookupTableInstruction(instruction);
	}

	if (isSolMemoProgram(programAddress)) {
		return parseSolMemoInstruction(instruction);
	}

	if (programAddress === STAKE_PROGRAM_ADDRESS) {
		return parseSolStakeInstruction(instruction);
	}

	consoleWarn(`Could not parse Solana instruction for program ${programAddress}`);

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

	consoleWarn(`Could not map Solana System instruction of type ${instructionType}`);

	return unreviewedInstruction();
};

const mapSolTokenInstruction = (instruction: SolParsedInstruction): MappedSolTransaction => {
	const { instructionType } = instruction;

	if (instructionType === TokenInstruction.Transfer) {
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

	if (instructionType === TokenInstruction.Approve) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				delegate: { address: destination }
			}
		} = instruction;

		return {
			amount,
			source,
			destination,
			isApproval: true
		};
	}

	if (instructionType === TokenInstruction.TransferChecked) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				destination: { address: destination },
				mint: { address: tokenAddress }
			}
		} = instruction;

		return {
			amount,
			source,
			destination,
			tokenAddress
		};
	}

	if (instructionType === TokenInstruction.ApproveChecked) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				delegate: { address: destination },
				mint: { address: tokenAddress }
			}
		} = instruction;

		return {
			amount,
			source,
			destination,
			tokenAddress,
			isApproval: true
		};
	}

	if (
		instructionType === TokenInstruction.SetAuthority ||
		instructionType === TokenInstruction.Burn ||
		instructionType === TokenInstruction.BurnChecked
	) {
		return unfaithfulInstruction();
	}

	consoleWarn(`Could not map Solana Token instruction of type ${instructionType}`);

	return unreviewedInstruction();
};

const mapSolToken2022Instruction = (instruction: SolParsedInstruction): MappedSolTransaction => {
	const { instructionType } = instruction;

	if (instructionType === Token2022Instruction.Transfer) {
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

	if (instructionType === Token2022Instruction.Approve) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				delegate: { address: destination }
			}
		} = instruction;

		return {
			amount,
			source,
			destination,
			isApproval: true
		};
	}

	if (instructionType === Token2022Instruction.TransferChecked) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				destination: { address: destination },
				mint: { address: tokenAddress }
			}
		} = instruction;

		return {
			amount,
			source,
			destination,
			tokenAddress
		};
	}

	if (instructionType === Token2022Instruction.ApproveChecked) {
		const {
			data: { amount },
			accounts: {
				source: { address: source },
				delegate: { address: destination },
				mint: { address: tokenAddress }
			}
		} = instruction;

		return {
			amount,
			source,
			destination,
			tokenAddress,
			isApproval: true
		};
	}

	// Token-2022 adds permissioned burns on top of the legacy program's burn variants.
	if (
		instructionType === Token2022Instruction.SetAuthority ||
		instructionType === Token2022Instruction.Burn ||
		instructionType === Token2022Instruction.BurnChecked ||
		instructionType === Token2022Instruction.PermissionedBurn ||
		instructionType === Token2022Instruction.PermissionedBurnChecked
	) {
		return unfaithfulInstruction();
	}

	consoleWarn(`Could not map Solana Token 2022 instruction of type ${instructionType}`);

	return unreviewedInstruction();
};

const mapSolComputeBudgetInstruction = (instruction: SolInstruction): MappedSolTransaction => {
	try {
		const parsedInstruction = parseSolComputeBudgetInstruction(instruction);

		const { instructionType } = parsedInstruction;

		if (instructionType === ComputeBudgetInstruction.SetComputeUnitPrice) {
			const {
				data: { microLamports }
			} = parsedInstruction;

			return { amount: undefined, computeUnitPrice: microLamports };
		}

		if (instructionType === ComputeBudgetInstruction.SetComputeUnitLimit) {
			const {
				data: { units }
			} = parsedInstruction;

			return { amount: undefined, computeUnitLimit: BigInt(units) };
		}

		// The deprecated `RequestUnits` carries its own flat `additionalFee`, which the review
		// cannot price the same way.
		if (instructionType === ComputeBudgetInstruction.RequestUnits) {
			return unfaithfulInstruction();
		}

		// Heap frame and loaded-accounts data size requests do not affect the fee.
		return ignoredInstruction();
	} catch (err: unknown) {
		consoleWarn('Could not parse Solana Compute Budget instruction', err);

		return unfaithfulInstruction();
	}
};

const isSolMemoProgram = (programAddress: SolAddress): boolean =>
	programAddress === MEMO_PROGRAM_ADDRESS || programAddress === MEMO_LEGACY_PROGRAM_ADDRESS;

// A memo is written to the transaction log and nowhere else: the program holds no account, so no
// memo moves value or hands over an authority. That is true of its text too, which is the dApp's
// own words about its transaction rather than a statement the chain enforces, so the review does
// not repeat it back to the user as if it were one.
const mapSolMemoInstruction = (): MappedSolTransaction => ignoredInstruction();

const mapSolAtaInstruction = (instruction: SolParsedInstruction): MappedSolTransaction => {
	const { instructionType } = instruction;

	if (
		instructionType === AssociatedTokenInstruction.CreateAssociatedToken ||
		instructionType === AssociatedTokenInstruction.CreateAssociatedTokenIdempotent
	) {
		return ignoredInstruction();
	}

	consoleWarn(`Could not map Solana ATA instruction of type ${instructionType}`);

	return unreviewedInstruction();
};

const mapSolLookupTableInstruction = (instruction: SolParsedInstruction): MappedSolTransaction => {
	const { instructionType } = instruction;

	// A lookup table is addressing, not value: it lets a message name accounts in fewer bytes and
	// grants no one anything. Creating and extending one costs rent, which the instruction does not
	// carry, the runtime works it out from the size; the same is already true of the token accounts
	// a swap opens along the way.
	if (
		instructionType === AddressLookupTableInstruction.CreateLookupTable ||
		instructionType === AddressLookupTableInstruction.ExtendLookupTable ||
		instructionType === AddressLookupTableInstruction.FreezeLookupTable ||
		instructionType === AddressLookupTableInstruction.DeactivateLookupTable
	) {
		return ignoredInstruction();
	}

	// Closing hands the table's whole balance to a recipient the instruction names, and only the
	// table's own authority can ask for it, so the balance leaving is the user's. Neither the amount
	// nor the recipient fits the single-value summary, which is what would let it ride along
	// unseen behind whatever else the message does.
	if (instructionType === AddressLookupTableInstruction.CloseLookupTable) {
		return unfaithfulInstruction();
	}

	consoleWarn(`Could not map Solana Address Lookup Table instruction of type ${instructionType}`);

	return unreviewedInstruction();
};

const mapSolStakeInstruction = (instruction: SolParsedInstruction): MappedSolTransaction => {
	const { instructionType } = instruction;

	// A withdrawal is the one stake instruction the summary can state in full: it names the amount,
	// the account it leaves and the account it arrives at, exactly as a plain SOL transfer does.
	if (instructionType === StakeInstruction.Withdraw) {
		const {
			data: { args: amount },
			accounts: {
				stake: { address: source },
				recipient: { address: destination }
			}
		} = instruction;

		return {
			amount,
			source,
			destination
		};
	}

	// Handing over a stake authority is a transfer of everything the account holds, dressed as
	// administration. The withdraw authority is the one that can take the stake out, and the
	// summary has no field that would show it changing hands, so this fails closed rather than
	// riding along behind whatever else the message does.
	if (
		instructionType === StakeInstruction.Authorize ||
		instructionType === StakeInstruction.AuthorizeChecked ||
		instructionType === StakeInstruction.AuthorizeWithSeed ||
		instructionType === StakeInstruction.AuthorizeCheckedWithSeed
	) {
		return unfaithfulInstruction();
	}

	// Reading the runtime's minimum delegation changes nothing at all.
	if (instructionType === StakeInstruction.GetMinimumDelegation) {
		return ignoredInstruction();
	}

	// The rest do something real to the user's stake — delegate it, split it, merge it, move it
	// between accounts they control, lock it up — and the review has no vocabulary for any of it.
	// Decoded or not, the honest answer is that this message does more than the summary shows.
	return unreviewedInstruction();
};

const isKitInstruction = (instruction: unknown): instruction is SolInstruction =>
	nonNullish(instruction) &&
	typeof instruction === 'object' &&
	'programAddress' in instruction &&
	'data' in instruction &&
	'accounts' in instruction;

/**
 * How one program's decoded instructions are spelled in the RPC's vocabulary.
 *
 * The decoders name an instruction by an enum member and its accounts by role, which is almost
 * exactly what the RPC reports: `TransferChecked` against `transferChecked`, `source` against
 * `source`. Where the two genuinely disagree, the difference is written down here rather than
 * handled by a branch per instruction, so a program's whole instruction set is covered at once
 * and a variant nobody thought about still arrives named.
 */
interface ProgramVocabulary {
	program: string;
	names: Record<number, string>;
	types?: Record<string, string>;
	accounts?: Record<string, string>;
	fields?: Record<string, string>;
}

/**
 * Built per call rather than held in a table, so that merely importing this module does not read
 * every program's enum. Consumers that mock a program package would otherwise fail to load over a
 * decoding path they never take.
 */
const vocabularyOf = (programId: SolAddress): ProgramVocabulary | undefined => {
	if (programId === SYSTEM_PROGRAM_ADDRESS) {
		return {
			program: 'system',
			names: SystemInstruction,
			// The RPC calls a SOL transfer `transfer` and its amount `lamports`, and the effects
			// below are written against those.
			types: { transferSol: 'transfer' },
			fields: { amount: 'lamports' }
		};
	}

	// `setAuthority` is the only instruction naming the account it acts on `owned`, and `mintTo`
	// the only one naming it `token`. The RPC calls both `account`, as everything else does.
	if (programId === TOKEN_PROGRAM_ADDRESS) {
		return {
			program: 'spl-token',
			names: TokenInstruction,
			accounts: { owned: 'account', token: 'account' }
		};
	}

	if (programId === TOKEN_2022_PROGRAM_ADDRESS) {
		return {
			program: 'spl-token-2022',
			names: Token2022Instruction,
			accounts: { owned: 'account', token: 'account' }
		};
	}

	if (programId === ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS) {
		return {
			program: 'spl-associated-token-account',
			names: AssociatedTokenInstruction,
			types: {
				createAssociatedToken: 'create',
				createAssociatedTokenIdempotent: 'createIdempotent'
			},
			// The RPC names the new account `account`, the wallet it belongs to `wallet` and
			// whoever funds it `source`. Only the mint is called the same thing by both.
			accounts: { ata: 'account', owner: 'wallet', payer: 'source' }
		};
	}

	// Stake and address lookup table are deliberately absent. No effect is derived from either, so
	// decoding them changes not one line of what the review shows, and reaching for their packages
	// here pulls both into the chunk the activity loads: 132KB for an identical screen.
};

const fieldOf = ({ info, key }: { info: object; key: string }): unknown =>
	(info as Record<string, unknown>)[key];

const lowerFirst = (value: string): string => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

const addressOfMeta = (meta: unknown): SolAddress | undefined =>
	nonNullish(meta) &&
	typeof meta === 'object' &&
	'address' in meta &&
	typeof meta.address === 'string'
		? meta.address
		: undefined;

/**
 * A decoded instruction's accounts and data, flattened the way the RPC reports them.
 *
 * The discriminator is dropped, since it says only which instruction this is, and an optional
 * field that carries nothing is dropped rather than reported as empty: an authority given up is
 * an authority with no name, not one named nothing.
 */
const infoOf = ({
	accounts,
	data,
	vocabulary: { accounts: renames = {}, fields = {} }
}: {
	accounts: Record<string, unknown>;
	data: Record<string, unknown>;
	vocabulary: ProgramVocabulary;
}): object => {
	const named = Object.entries(accounts).reduce<Record<string, unknown>>((acc, [role, meta]) => {
		const value = addressOfMeta(meta);

		return nonNullish(value) ? { ...acc, [renames[role] ?? role]: value } : acc;
	}, {});

	return Object.entries(data).reduce<Record<string, unknown>>((acc, [key, raw]) => {
		if (key === 'discriminator') {
			return acc;
		}

		const value = isSolOption(raw) ? unwrapOption(raw) : raw;

		return nonNullish(value) ? { ...acc, [fields[key] ?? key]: value } : acc;
	}, named);
};

const isSolOption = (value: unknown): value is Option<SolAddress> =>
	nonNullish(value) && typeof value === 'object' && '__option' in value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	nonNullish(value) && typeof value === 'object';

/**
 * A kit instruction read into the shape the RPC reports.
 *
 * An unsigned message carries its instructions as raw bytes, so nothing below recognised them:
 * every WalletConnect request derived an empty effect list from the message itself, which left the
 * summary permanently unstated and, once the review started listing what it could not read, put
 * "unrecognised" against a plain SOL transfer. The wallet already decodes those bytes to name the
 * parties; this puts the same decoding in front of the effects, so what a message says it does is
 * read exactly as what a run did.
 *
 * Guarded, because the decoders assert on their input: a malformed or not yet supported variant
 * must leave the instruction unread, never throw into the signing flow.
 */
export const asSolParsedRpcInstruction = (
	instruction: unknown
): SolParsedRpcInstruction | undefined => {
	if (!isKitInstruction(instruction)) {
		return;
	}

	const programId = instruction.programAddress;

	const vocabulary = vocabularyOf(programId);

	if (isNullish(vocabulary)) {
		return;
	}

	try {
		const decoded = parseSolInstruction(instruction);

		if (!('instructionType' in decoded)) {
			return;
		}

		const { instructionType } = decoded;

		const name = vocabulary.names[Number(instructionType)];

		if (isNullish(name)) {
			return;
		}

		const spelled = lowerFirst(name);
		const type = vocabulary.types?.[spelled] ?? spelled;

		const accounts = 'accounts' in decoded && isRecord(decoded.accounts) ? decoded.accounts : {};
		const data = 'data' in decoded && isRecord(decoded.data) ? decoded.data : {};

		const info = infoOf({ accounts, data, vocabulary });

		return {
			program: vocabulary.program,
			programId,
			parsed: {
				type,
				// A checked transfer or approval states the decimals alongside the amount, and the
				// RPC reports the pair nested. Both spellings are carried so neither reader has to
				// know which side produced the instruction.
				info:
					'decimals' in info && 'amount' in info
						? {
								...info,
								tokenAmount: {
									amount: String(fieldOf({ info, key: 'amount' })),
									decimals: fieldOf({ info, key: 'decimals' })
								}
							}
						: info
			}
		};
	} catch (_err: unknown) {
		// An instruction the decoders cannot read stays unread, which is the same outcome an
		// unknown program gets and the honest one.
	}
};

/**
 * The same, but total: an instruction the wallet cannot decode keeps its place in the list.
 *
 * Dropping it would shift every instruction after it, and both the route programs and the count of
 * what could not be read are addressed by position.
 */
export const asSolParsedRpcInstructionOrSelf = (instruction: unknown): unknown =>
	asSolParsedRpcInstruction(instruction) ?? instruction;

export const mapSolInstruction = (instruction: SolInstruction): MappedSolTransaction => {
	// Compute budget instructions can never move funds, but they do set the prioritisation
	// fee the wallet pays in SOL, so their directives are surfaced rather than ignored.
	// Parsing stays behind its own guard: a malformed or not-yet-supported variant would
	// otherwise throw and crash the signing flow.
	if (instruction.programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS) {
		return mapSolComputeBudgetInstruction(instruction);
	}

	const parsedInstruction = parseSolInstruction(instruction);

	if (!('instructionType' in parsedInstruction)) {
		return unreviewedInstruction();
	}

	const { programAddress } = parsedInstruction;

	if (programAddress === SYSTEM_PROGRAM_ADDRESS) {
		return mapSolSystemInstruction(parsedInstruction);
	}

	if (programAddress === TOKEN_PROGRAM_ADDRESS) {
		return mapSolTokenInstruction(parsedInstruction);
	}

	if (programAddress === TOKEN_2022_PROGRAM_ADDRESS) {
		return mapSolToken2022Instruction(parsedInstruction);
	}

	if (programAddress === ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS) {
		return mapSolAtaInstruction(parsedInstruction);
	}

	if (programAddress === ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS) {
		return mapSolLookupTableInstruction(parsedInstruction);
	}

	if (isSolMemoProgram(programAddress)) {
		return mapSolMemoInstruction();
	}

	if (programAddress === STAKE_PROGRAM_ADDRESS) {
		return mapSolStakeInstruction(parsedInstruction);
	}

	consoleWarn(`Could not map Solana instruction for program ${programAddress}`);

	return unreviewedInstruction();
};
