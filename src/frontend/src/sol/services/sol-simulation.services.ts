import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS
} from '$sol/constants/sol.constants';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSimulationResult } from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { deriveSolMessageSummary } from '$sol/utils/sol-message-summary.utils';
import {
	isEmptySolSimulationPreview,
	mapSolSimulationAccountOwners,
	mapSolSimulationPreview,
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
	// and the preview costs one round trip rather than two.
	const [preAccounts, { err, accounts: postAccounts, innerInstructions }] = await Promise.all([
		getMultipleAccountsInfo({ addresses, network }),
		simulateTransactionAccounts({ base64EncodedTransactionMessage, addresses, network })
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

	const legs = await mapSolSimulatedTransferLegs({
		instructions: transactionMessage.instructions,
		innerInstructions,
		network,
		// Handing the mints the simulation already read to the mapper is what keeps it from
		// looking each one up: an unchecked SPL transfer does not carry its mint, and recovering
		// it costs a round trip per leg on the review's critical path.
		addressToToken
	});

	// The lamports each account holds going in, so a close can say what it hands back.
	const accountLamports = addresses.reduce<Record<SolAddress, bigint>>((acc, account, index) => {
		const lamports = preAccounts[index]?.lamports;

		if (nonNullish(lamports)) {
			acc[account] = lamports;
		}

		return acc;
	}, {});

	// The kit instructions are not parsed, so they contribute nothing themselves; iterating them is
	// what attaches each simulated nested call to the instruction that made it.
	const instructions = mapSolInstructionSummaries({
		instructions: [...transactionMessage.instructions],
		innerInstructions: [...innerInstructions].map(({ index, instructions: inner }) => ({
			index: Number(index),
			instructions: [...inner]
		})),
		ownedAddresses: [address, ...ownedAddresses],
		addressToToken,
		accountLamports,
		// A run whose calls all happen inside a program the wallet cannot read produces no effects
		// at all, and the review then listed nothing for a transaction that plainly does something.
		// Saying which programs it hands the instructions to is worth more than an empty list.
		includeUnrecognised: true
	});

	// The message read on its own, without the nested calls the run reveals: a second account of
	// the same transaction, which is what lets the review notice the two disagreeing.
	const messageSummary = deriveSolMessageSummary({
		instructions: mapSolInstructionSummaries({
			instructions: [...transactionMessage.instructions],
			innerInstructions: [],
			ownedAddresses: [address, ...ownedAddresses],
			addressToToken
		})
	});

	return {
		...(!isEmptySolSimulationPreview(preview) && { preview }),
		...(instructions.length > 0 && { instructions }),
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
