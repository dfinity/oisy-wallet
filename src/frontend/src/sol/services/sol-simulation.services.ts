import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import {
	getMultipleAccountsInfo,
	getSolCreateAccountFee,
	simulateTransactionAccounts
} from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS
} from '$sol/constants/sol.constants';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSimulationResult } from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { asSolParsedRpcInstructionOrSelf } from '$sol/utils/sol-instructions.utils';
import { deriveSolMessageSummary } from '$sol/utils/sol-message-summary.utils';
import {
	isEmptySolSimulationPreview,
	mapSolSimulationAccountOwners,
	mapSolSimulationPreview,
	parseTokenAccountState,
	selectSolSimulationAddresses
} from '$sol/utils/sol-simulation.utils';
import {
	deriveSolTransferParties,
	mapSolSimulatedTransferLegs
} from '$sol/utils/sol-transfer-parties.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const simulate = async ({
	base64EncodedTransactionMessage,
	transactionMessage,
	address,
	network
}: {
	base64EncodedTransactionMessage: string;
	transactionMessage: CompilableTransactionMessage;
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<SolSimulationResult | undefined> => {
	const addresses = selectSolSimulationAddresses(transactionMessage);

	// Truncating would be worse than saying nothing: the preview would report "no changes" for
	// accounts it never asked about.
	if (addresses.length > SOLANA_SIMULATION_MAX_ACCOUNTS) {
		return undefined;
	}

	// The "before" read does not depend on the simulation's outcome, so the two go out together
	// and the preview costs one round trip rather than two. The reserve a token account costs to
	// exist joins them: a creation may fund one with more than that and let its initialisation
	// read the difference as the balance, and nothing in the message says where the line falls.
	// Best effort - without it the balance of an account this message opens is stated as unknown
	// rather than guessed at.
	const [preAccounts, { err, accounts: postAccounts, innerInstructions }, rentExemptMinimum] =
		await Promise.all([
			getMultipleAccountsInfo({ addresses, network }),
			simulateTransactionAccounts({ base64EncodedTransactionMessage, addresses, network }),
			getSolCreateAccountFee(network).catch(() => undefined)
		]);

	// A run that failed rolled its changes back, so its post-state describes nothing the user
	// would actually get. Showing those deltas would be worse than showing none.
	if (nonNullish(err)) {
		return undefined;
	}

	const preview = mapSolSimulationPreview({
		addresses,
		preAccounts,
		postAccounts,
		userAddress: address
	});

	const { ownedAddresses, addressToOwner, addressToToken } = mapSolSimulationAccountOwners({
		addresses,
		preAccounts,
		postAccounts,
		userAddress: address
	});

	// Who held each token account going in. Not the map of owners the run reports, which prefers
	// the state after the transaction: an address closed and opened again for somebody else within
	// the one message would read as theirs at a close that happened while it was still the user's.
	const { accountHolders, accountMintsBefore } = addresses.reduce<{
		accountHolders: Record<SolAddress, SolAddress>;
		accountMintsBefore: Record<SolAddress, SplTokenAddress>;
	}>(
		(acc, account, index) => {
			const preAccount = preAccounts[index];
			const token = nonNullish(preAccount) ? parseTokenAccountState(preAccount) : undefined;

			if (nonNullish(token)) {
				acc.accountHolders[account] = token.owner;
				acc.accountMintsBefore[account] = token.tokenAddress;
			}

			return acc;
		},
		{ accountHolders: {}, accountMintsBefore: {} }
	);

	const legs = await mapSolSimulatedTransferLegs({
		instructions: transactionMessage.instructions,
		innerInstructions,
		network,
		// Handing the mints the simulation already read to the mapper is what keeps it from
		// looking each one up: an unchecked SPL transfer does not carry its mint, and recovering
		// it costs a round trip per leg on the review's critical path.
		addressToToken,
		// Whose each account was going in, for the same reason the operation list reads it: the
		// map of owners the run reports is the state after the transaction.
		accountHolders
	});

	// The lamports each account holds going in, so a close can say what it hands back.
	const accountLamports = addresses.reduce<Record<SolAddress, bigint>>((acc, account, index) => {
		const lamports = preAccounts[index]?.lamports;

		if (nonNullish(lamports)) {
			acc[account] = lamports;
		}

		return acc;
	}, {});

	// What each token account held going in. A wrapped SOL account holding nothing is closed rather
	// than unwrapped, and the two read differently: there is no SOL to unwrap out of an empty one.
	const accountTokenAmounts = addresses.reduce<Record<SolAddress, bigint>>(
		(acc, account, index) => {
			const preAccount = preAccounts[index];
			const amount = nonNullish(preAccount)
				? parseTokenAccountState(preAccount)?.amount
				: undefined;

			if (nonNullish(amount)) {
				acc[account] = amount;
			}

			return acc;
		},
		{}
	);

	// The kit instructions are not parsed, so they contribute nothing themselves; iterating them is
	// what attaches each simulated nested call to the instruction that made it.
	const instructions = mapSolInstructionSummaries({
		instructions: [...transactionMessage.instructions].map(asSolParsedRpcInstructionOrSelf),
		innerInstructions: [...innerInstructions].map(({ index, instructions: inner }) => ({
			index: Number(index),
			instructions: [...inner]
		})),
		ownedAddresses: [address, ...ownedAddresses],
		userAddress: address,
		addressToToken,
		accountHolders,
		accountMintsBefore,
		accountLamports,
		accountTokenAmounts,
		rentExemptMinimum,
		// A run whose calls all happen inside a program the wallet cannot read produces no effects
		// at all, and the review then listed nothing for a transaction that plainly does something.
		// Saying which programs it hands the instructions to is worth more than an empty list.
		includeUnrecognised: true
	});

	// The message read on its own, without the nested calls the run reveals: a second account of
	// the same transaction, which is what lets the review notice the two disagreeing.
	const messageSummary = deriveSolMessageSummary({
		instructions: mapSolInstructionSummaries({
			instructions: [...transactionMessage.instructions].map(asSolParsedRpcInstructionOrSelf),
			innerInstructions: [],
			ownedAddresses: [address, ...ownedAddresses],
			userAddress: address,
			addressToToken,
			accountHolders,
			accountMintsBefore
		}),
		userAddress: address
	});

	return {
		...(!isEmptySolSimulationPreview(preview) && { preview }),
		// Empty included: a run with nothing to list has answered, and leaving the list out made the
		// review rebuild it from the message, which cannot tell an account that is already there
		// from one it opens.
		instructions,
		...(messageSummary.kind !== 'other' && { messageSummary }),
		parties: {
			...deriveSolTransferParties({
				legs,
				ownedAddresses: [address, ...ownedAddresses],
				addressToOwner
			}),
			partial: false
		}
	};
};

/**
 * What the network says this message would do: the changes to the user's own accounts, and who it
 * spends from and pays.
 *
 * Simulation sees what a decode structurally cannot: effects produced inside cross-program
 * invocations, which do not exist in an unsigned message at all. A routed swap makes every one of
 * its transfers there, so its parties can only be named from here.
 *
 * Best-effort by design. Any failure (an unsupported RPC, a rate limit, a transaction that would
 * itself fail, a provider taking too long) resolves to `undefined`, and the caller falls back to
 * what the message states on its own while saying that the lists are then partial. The simulation
 * is extra context on top of the review, not the material the review is made of, so its absence
 * must never keep the user from seeing or rejecting a request.
 */
export const simulateSolTransaction = async (params: {
	base64EncodedTransactionMessage: string;
	transactionMessage: CompilableTransactionMessage;
	address: OptionSolAddress;
	network: SolanaNetworkType;
}): Promise<SolSimulationResult | undefined> => {
	const { address } = params;

	if (isNullish(address)) {
		return undefined;
	}

	try {
		return await Promise.race([
			simulate({ ...params, address }),
			waitForMilliseconds(SOLANA_SIMULATION_TIMEOUT_MILLISECONDS).then(() => undefined)
		]);
	} catch (_: unknown) {
		return undefined;
	}
};
