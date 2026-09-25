import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type {
	SolInstruction,
	SolParsedRpcInstruction,
	SolRpcInstruction
} from '$sol/types/sol-instructions';
import type {
	SolanaSimulatedInnerInstruction,
	SolanaSimulatedInnerInstructions
} from '$sol/types/sol-rpc';
import type {
	MappedSolTransaction,
	SolMappedTransaction,
	SolTransferLeg,
	SolTransferParties,
	SolTransferParty
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	asSolParsedRpcInstruction,
	mapSolInstruction,
	mapSolParsedInstruction
} from '$sol/utils/sol-instructions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * The parsed instruction types that move value from one account to another.
 *
 * The gate is on the instruction, not on the mapper's output, because the mappers describe more
 * than transfers and two of their descriptions name something that is not a counterparty:
 * `createAccount` reports the account being funded into existence, and `mintTo`/`burn` substitute
 * the mint for the party that does not exist. Gating here is also what keeps an associated token
 * account creation out of both lists, since the System `createAccount` that funds it is a
 * cross-program invocation of its own.
 */
const SOL_TRANSFER_INSTRUCTION_TYPES = ['transfer', 'transferChecked'];

export const isSolTransferInstruction = (
	instruction: SolRpcInstruction | SolanaSimulatedInnerInstruction
): boolean =>
	'parsed' in instruction && SOL_TRANSFER_INSTRUCTION_TYPES.includes(instruction.parsed.type);

/**
 * A leg from an already-parsed RPC instruction, for the transfers the network reports.
 *
 * Only call it for an instruction {@link isSolTransferInstruction} accepts.
 */
export const toSolParsedTransferLeg = ({
	value: amount,
	from: source,
	to: destination,
	tokenAddress
}: SolMappedTransaction): SolTransferLeg => ({
	amount,
	source,
	destination,
	...(nonNullish(tokenAddress) && { tokenAddress })
});

/**
 * A leg from the statically decoded form of an instruction, for an unsigned message.
 *
 * No type gate is needed on this side: everything the kit mapper describes that is not a transfer
 * already arrives without both parties. `createAccount` reports only its payer, an associated token
 * account creation and a compute budget directive report nothing at all. An approval is the one
 * exception, since its `destination` holds a delegate rather than a recipient, so it is refused
 * explicitly and keeps its own spender row.
 */
export const toSolTransferLeg = ({
	amount,
	source,
	destination,
	tokenAddress,
	isApproval
}: MappedSolTransaction): SolTransferLeg | undefined =>
	isNullish(amount) || isNullish(source) || isNullish(destination) || (isApproval ?? false)
		? undefined
		: { amount, source, destination, ...(nonNullish(tokenAddress) && { tokenAddress }) };

type Holders = Partial<Record<SolAddress, SolAddress>>;

const TOKEN_PROGRAMS = ['spl-token', 'spl-token-2022'];

const addressIn = ({ info, key }: { info: object; key: string }): SolAddress | undefined => {
	const value: unknown = (info as Record<string, unknown>)[key];

	return typeof value === 'string' ? value : undefined;
};

/**
 * Who holds each token account once an instruction has run, from who held it before. An opening
 * names the holder, and a close ends the account: the address is nobody's until something opens
 * it again.
 */
const holdersAfter = ({
	holders,
	instruction
}: {
	holders: Holders;
	instruction: SolParsedRpcInstruction | undefined;
}): Holders => {
	if (isNullish(instruction)) {
		return holders;
	}

	const {
		program,
		parsed: { type, info }
	} = instruction;

	const account = addressIn({ info, key: 'account' });

	if (isNullish(account)) {
		return holders;
	}

	if (program === 'spl-associated-token-account' && ['create', 'createIdempotent'].includes(type)) {
		const wallet = addressIn({ info, key: 'wallet' });

		return nonNullish(wallet) ? { ...holders, [account]: wallet } : holders;
	}

	if (isNullish(program) || !TOKEN_PROGRAMS.includes(program)) {
		return holders;
	}

	if (['initializeAccount', 'initializeAccount2', 'initializeAccount3'].includes(type)) {
		const owner = addressIn({ info, key: 'owner' });

		return nonNullish(owner) ? { ...holders, [account]: owner } : holders;
	}

	if (type === 'closeAccount') {
		const { [account]: _closed, ...open } = holders;

		return open;
	}

	return holders;
};

const withHolders = ({
	leg,
	holders
}: {
	leg: SolTransferLeg;
	holders: Holders;
}): SolTransferLeg => {
	const { [leg.source]: sourceHolder, [leg.destination]: destinationHolder } = holders;

	return {
		...leg,
		...(nonNullish(sourceHolder) && { sourceHolder }),
		...(nonNullish(destinationHolder) && { destinationHolder })
	};
};

export const mapSolTransferLegs = (instructions: readonly SolInstruction[]): SolTransferLeg[] =>
	Array.from(instructions).reduce<SolTransferLeg[]>((acc, instruction) => {
		const leg = toSolTransferLeg(mapSolInstruction({ instruction }));

		return nonNullish(leg) ? [...acc, leg] : acc;
	}, []);

const mapSolInnerTransferLegs = async ({
	instructions,
	network,
	addressToToken,
	holders
}: {
	instructions: readonly SolanaSimulatedInnerInstruction[];
	network: SolanaNetworkType;
	addressToToken: Record<SolAddress, SplTokenAddress>;
	holders: Holders;
}): Promise<{ legs: SolTransferLeg[]; holders: Holders }> =>
	await instructions.reduce<Promise<{ legs: SolTransferLeg[]; holders: Holders }>>(
		async (acc, instruction) => {
			const { legs, holders: current } = await acc;

			const next = holdersAfter({
				holders: current,
				instruction: 'parsed' in instruction ? (instruction as SolParsedRpcInstruction) : undefined
			});

			if (!('parsed' in instruction) || !isSolTransferInstruction(instruction)) {
				return { legs, holders: next };
			}

			const mapped = await mapSolParsedInstruction({
				identity: undefined,
				instruction: { ...instruction, programAddress: instruction.programId },
				network,
				addressToToken
			});

			return {
				legs: nonNullish(mapped)
					? [...legs, withHolders({ leg: toSolParsedTransferLeg(mapped), holders: current })]
					: legs,
				holders: next
			};
		},
		Promise.resolve({ legs: [], holders })
	);

/**
 * Every leg a message would produce: the transfers it states itself, and the ones a simulation
 * reports it would make inside cross-program invocations.
 *
 * Both matter, and neither alone is enough. A plain send performs its transfer at top level and
 * makes no invocation; a routed swap makes every one of its transfers as an invocation and states
 * none of them. Each top-level instruction is followed by the invocations it produced, so the legs
 * read in the order the transaction runs. The simulation groups them by the index of the
 * instruction that made them, exactly as `getTransaction` does, so no splice arithmetic is needed.
 *
 * Each leg carries whose its two ends were at that point, walked in the same order from the
 * holders before the transaction: an opening names a holder and a close ends it.
 */
export const mapSolSimulatedTransferLegs = async ({
	instructions,
	innerInstructions,
	network,
	addressToToken,
	accountHolders = {}
}: {
	instructions: readonly SolInstruction[];
	innerInstructions: SolanaSimulatedInnerInstructions;
	network: SolanaNetworkType;
	addressToToken: Record<SolAddress, SplTokenAddress>;
	// Who held each token account going in, as the run's state before the transaction reports it.
	accountHolders?: Holders;
}): Promise<SolTransferLeg[]> => {
	const { legs } = await Array.from(instructions).reduce<
		Promise<{ legs: SolTransferLeg[]; holders: Holders }>
	>(
		async (acc, instruction, index) => {
			const { legs, holders } = await acc;

			const leg = toSolTransferLeg(mapSolInstruction({ instruction }));

			const { instructions: inner } =
				innerInstructions.find(({ index: parentIndex }) => parentIndex === index) ?? {};

			const { legs: innerLegs, holders: within } = await mapSolInnerTransferLegs({
				instructions: inner ?? [],
				network,
				addressToToken,
				holders
			});

			return {
				legs: [...legs, ...(nonNullish(leg) ? [withHolders({ leg, holders })] : []), ...innerLegs],
				holders: holdersAfter({
					holders: within,
					instruction: asSolParsedRpcInstruction(instruction)
				})
			};
		},
		Promise.resolve({ legs: [], holders: accountHolders })
	);

	return legs;
};

/**
 * The two lists, from the legs a transaction contains and the set of accounts the user owns.
 *
 * Pure, and the single place the rules live: the review derives its legs from a simulation and the
 * activity list from transaction metadata, but a user who reviews a swap and then opens it in their
 * activity must be shown the same two lists.
 *
 * Order is the instruction order and an address is kept on first appearance, so the lists read in
 * the order the transaction does rather than in an order this function invented.
 *
 * Whose an account is, is read at each transfer: the holder the leg carries for that end where it
 * carries one, and the accounts named as the user's otherwise. Those are every account the user
 * held at any point of the message, so read alone they would lend an address closed and opened for
 * a different holder to whichever holder it never was at that transfer.
 */
export const deriveSolTransferParties = ({
	legs,
	ownedAddresses,
	addressToOwner
}: {
	legs: SolTransferLeg[];
	ownedAddresses: SolAddress[];
	addressToOwner?: Record<SolAddress, SolAddress>;
}): Omit<SolTransferParties, 'partial'> => {
	const owned = new Set(ownedAddresses);

	interface Party {
		address: SolAddress;
		holder?: SolAddress;
	}

	const isUsers = ({ address, holder }: Party): boolean =>
		nonNullish(holder) ? owned.has(holder) : owned.has(address);

	const add = ({ parties, party }: { parties: Party[]; party: Party }): Party[] =>
		parties.some(({ address }) => address === party.address) ? parties : [...parties, party];

	const { sources, destinations } = legs.reduce<{ sources: Party[]; destinations: Party[] }>(
		({ sources, destinations }, { source, destination, sourceHolder, destinationHolder }) => {
			const from: Party = {
				address: source,
				...(nonNullish(sourceHolder) && { holder: sourceHolder })
			};
			const to: Party = {
				address: destination,
				...(nonNullish(destinationHolder) && { holder: destinationHolder })
			};

			const spends = isUsers(from);

			return {
				sources: spends ? add({ parties: sources, party: from }) : sources,
				destinations:
					spends || isUsers(to) ? add({ parties: destinations, party: to }) : destinations
			};
		},
		{ sources: [], destinations: [] }
	);

	const toParty = ({ address, holder }: Party): SolTransferParty => {
		const owner = holder ?? addressToOwner?.[address];

		return { address, ...(nonNullish(owner) && { owner }), own: isUsers({ address, holder }) };
	};

	return { sources: sources.map(toParty), destinations: destinations.map(toParty) };
};

/**
 * What to show for a party: the owning wallet where it is known, the account itself otherwise.
 */
export const solTransferPartyAddress = ({ address, owner }: SolTransferParty): SolAddress =>
	owner ?? address;

/**
 * Whether a Sources list says nothing the review does not already say.
 *
 * Every source is one of the user's own accounts by the rule itself, and each is displayed by its
 * owning wallet, so an ordinary send lists the very address the review already names as its
 * source. A source that cannot be resolved to that wallet is the opposite: an account the user is
 * spending from without recognising it, which is exactly worth showing.
 */
export const isSolTransferSourcesRedundant = ({
	sources,
	userAddress
}: {
	sources: SolTransferParty[];
	userAddress: SolAddress;
}): boolean => sources.every((party) => solTransferPartyAddress(party) === userAddress);
