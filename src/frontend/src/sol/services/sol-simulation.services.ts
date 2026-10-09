import { ZERO } from '$lib/constants/app.constants';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS
} from '$sol/constants/sol.constants';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolClosedAccount, SolSimulationResult } from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	mapSolInstructionSummaries,
	solClosingInstructionCandidates,
	solOpensAccountBeyondRent,
	type SolInstructionGroup
} from '$sol/utils/sol-instruction-summary.utils';
import { asSolParsedRpcInstructionOrSelf } from '$sol/utils/sol-instructions.utils';
import { deriveSolMessageSummary } from '$sol/utils/sol-message-summary.utils';
import {
	findSolClosedAppAccounts,
	findSolUnreadPrograms,
	isEmptySolSimulationPreview,
	mapSolSimulationAccountOwners,
	mapSolSimulationPreview,
	parseTokenAccountState,
	selectSolSimulationAddresses,
	solClosedAccountsReachWallet,
	solOpenAppAccountsLostLamports
} from '$sol/utils/sol-simulation.utils';
import { solWalletLamportsStated } from '$sol/utils/sol-transaction-summary.utils';
import {
	deriveSolTransferParties,
	mapSolSimulatedTransferLegs
} from '$sol/utils/sol-transfer-parties.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { compileTransaction, getBase64EncodedWireTransaction } from '@solana/kit';

/**
 * Which of the given closed accounts still hold every lamport they held before the message, after
 * its instructions before the given one, from a single run of those instructions alone. One an
 * earlier call already took part of would have its close credit the last call with that share too.
 * Anything that keeps that run from answering - a message that cannot be cut there, a run that
 * fails - says none do.
 */
const fundedBefore = async ({
	transactionMessage,
	instruction,
	accounts,
	network
}: {
	transactionMessage: CompilableTransactionMessage;
	instruction: number;
	accounts: SolClosedAccount[];
	network: SolanaNetworkType;
}): Promise<SolAddress[]> => {
	try {
		const { err, accounts: states } = await simulateTransactionAccounts({
			base64EncodedTransactionMessage: getBase64EncodedWireTransaction(
				compileTransaction({
					...transactionMessage,
					instructions: transactionMessage.instructions.slice(0, instruction)
				})
			),
			addresses: accounts.map(({ account }) => account),
			network
		});

		if (nonNullish(err)) {
			return [];
		}

		return accounts.reduce<SolAddress[]>((acc, { account, lamports }, index) => {
			const state = states[index];

			return nonNullish(state) && BigInt(state.lamports) >= lamports ? [...acc, account] : acc;
		}, []);
	} catch (_: unknown) {
		return [];
	}
};

/**
 * The closed accounts, each with the instruction that emptied it where that can be established.
 *
 * The one instruction that calls the owning program with the account emptied it. When several do,
 * an account the program has emptied stays loaded for the rest of the message, and a later call can
 * name it again: the last of them is the one only if the account still held all its lamports when
 * that call began, which a second run of the message up to it shows. Otherwise the close stays
 * without an instruction, and so without a line.
 *
 * Accounts whose last call is the same instruction share that run, which asks for all of them at
 * once: one run per instruction at most, however many accounts the message closes.
 */
const attributeClosedAccounts = async ({
	closedAccounts,
	transactionMessage,
	innerInstructions,
	network
}: {
	closedAccounts: SolClosedAccount[];
	transactionMessage: CompilableTransactionMessage;
	innerInstructions: SolInstructionGroup[];
	network: SolanaNetworkType;
}): Promise<SolClosedAccount[]> => {
	const attributions = closedAccounts.map((closed) => ({
		closed,
		candidates: solClosingInstructionCandidates({
			account: closed.account,
			program: closed.program,
			instructions: transactionMessage.instructions,
			innerInstructions
		})
	}));

	// The accounts each second run answers for, by the instruction it stops at.
	const checks = attributions.reduce((acc, { closed, candidates }) => {
		const last = candidates.at(-1);

		if (candidates.length > 1 && nonNullish(last)) {
			acc.set(last, [...(acc.get(last) ?? []), closed]);
		}

		return acc;
	}, new Map<number, SolClosedAccount[]>());

	const funded = new Set(
		(
			await Promise.all(
				[...checks].map(([instruction, accounts]) =>
					fundedBefore({ transactionMessage, instruction, accounts, network })
				)
			)
		).flat()
	);

	return attributions.map(({ closed, candidates }) => {
		const last = candidates.at(-1);

		if (isNullish(last)) {
			return closed;
		}

		return candidates.length === 1 || funded.has(closed.account)
			? { ...closed, instruction: last }
			: closed;
	});
};

const simulate = async ({
	base64EncodedTransactionMessage,
	transactionMessage,
	address,
	network,
	rentExemptMinimumRequest
}: {
	base64EncodedTransactionMessage: string;
	transactionMessage: CompilableTransactionMessage;
	address: SolAddress;
	network: SolanaNetworkType;
	// The decode's request for the reserve a token account costs to exist, still pending when the
	// run starts, so that waiting for it falls inside the run's own timeout.
	rentExemptMinimumRequest: Promise<bigint | undefined>;
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
	const [preAccounts, { err, accounts: postAccounts, innerInstructions, fee }, rentExemptMinimum] =
		await Promise.all([
			getMultipleAccountsInfo({ addresses, network }),
			simulateTransactionAccounts({ base64EncodedTransactionMessage, addresses, network }),
			rentExemptMinimumRequest
		]);

	// A run that failed rolled its changes back, so its post-state describes nothing the user
	// would actually get. Showing those deltas would be worse than showing none.
	if (nonNullish(err)) {
		return undefined;
	}

	// A run with a nested call that names no program cannot be said to call only known ones, and
	// the review would read the empty list as exactly that.
	const unreadPrograms = findSolUnreadPrograms(innerInstructions);

	if (isNullish(unreadPrograms)) {
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

	const innerInstructionGroups = [...innerInstructions].map(({ index, instructions: inner }) => ({
		index: Number(index),
		instructions: [...inner]
	}));

	// The kit instructions are not parsed, so they contribute nothing themselves; iterating them is
	// what attaches each simulated nested call to the instruction that made it.
	const summarise = (closedAccounts: SolClosedAccount[] = []) =>
		mapSolInstructionSummaries({
			instructions: [...transactionMessage.instructions].map(asSolParsedRpcInstructionOrSelf),
			innerInstructions: innerInstructionGroups,
			ownedAddresses: [address, ...ownedAddresses],
			userAddress: address,
			addressToToken,
			accountHolders,
			accountMintsBefore,
			accountLamports,
			accountTokenAmounts,
			rentExemptMinimum,
			closedAccounts,
			// A run whose calls all happen inside a program the wallet cannot read produces no effects
			// at all, and the review then listed nothing for a transaction that plainly does something.
			// Saying which programs it hands the instructions to is worth more than an empty list.
			includeUnrecognised: true
		});

	const summaries = summarise();

	// An application closing an account of its own, such as a liquidity position handing back its
	// rent, moves the lamports itself, and only the account's state says it happened. Its close is
	// listed when every lamport it held reached the wallet, which the wallet's own change has to show:
	// with the fee and every line the list already states taken out, the rest must be exactly that.
	const closedAccounts = findSolClosedAppAccounts({ addresses, preAccounts, postAccounts });

	const walletIndex = addresses.indexOf(address);
	const walletBefore = preAccounts[walletIndex]?.lamports;
	const walletAfter = postAccounts[walletIndex]?.lamports;

	// Charged to whoever pays the fee, which need not be the wallet. A run that leaves out a fee the
	// wallet pays leaves the comparison off by that fee, so no close is listed from it.
	const walletFee = transactionMessage.feePayer.address === address ? fee : ZERO;

	// An open app account paying the wallet could stand in for a close paid elsewhere, so the closes
	// are credited only when none of them lost lamports.
	const reachWallet =
		nonNullish(walletFee) &&
		!solOpenAppAccountsLostLamports({ addresses, preAccounts, postAccounts }) &&
		solClosedAccountsReachWallet({
			closedAccounts,
			walletChange:
				walletIndex >= 0 && nonNullish(walletBefore) && nonNullish(walletAfter)
					? BigInt(walletAfter) - BigInt(walletBefore)
					: undefined,
			statedChange: solWalletLamportsStated({ instructions: summaries, userAddress: address }),
			fee: walletFee
		});

	const instructions = reachWallet
		? summarise(
				await attributeClosedAccounts({
					closedAccounts,
					transactionMessage,
					innerInstructions: innerInstructionGroups,
					network
				})
			)
		: summaries;

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
		...(solOpensAccountBeyondRent({
			innerInstructions: innerInstructionGroups,
			rentExemptMinimum
		}) && { opensAccountBeyondRent: true }),
		parties: {
			...deriveSolTransferParties({
				legs,
				ownedAddresses: [address, ...ownedAddresses],
				addressToOwner
			}),
			partial: false
		},
		unreadPrograms
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
	rentExemptMinimumRequest: Promise<bigint | undefined>;
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
