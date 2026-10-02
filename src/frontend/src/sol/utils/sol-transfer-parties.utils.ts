import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolInstruction, SolRpcInstruction } from '$sol/types/sol-instructions';
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

const addressIn = ({
	info,
	key
}: {
	info: object | undefined;
	key: string;
}): SolAddress | undefined => {
	const value: unknown = nonNullish(info) ? (info as Record<string, unknown>)[key] : undefined;

	return typeof value === 'string' ? value : undefined;
};

// What the walk reads of a parsed instruction, which the message's own instructions and the run's
// inner ones both provide, in slightly different shapes.
interface ParsedStep {
	program?: string;
	parsed: { type: string; info?: object };
}

// What an instruction does to the life of a token account. An opening names the holder of the
// account it opens, and a close ends it. An associated account's opening is marked, because its
// address can only ever hold that wallet's account: before the opening as much as after it.
type LifecycleEvent = { account: SolAddress } & (
	{ kind: 'open'; holder?: SolAddress; associated: boolean } | { kind: 'close' }
);

const lifecycleEventOf = (instruction: ParsedStep | undefined): LifecycleEvent | undefined => {
	if (isNullish(instruction)) {
		return undefined;
	}

	const {
		program,
		parsed: { type, info }
	} = instruction;

	const account = addressIn({ info, key: 'account' });

	if (isNullish(account)) {
		return undefined;
	}

	if (program === 'spl-associated-token-account' && ['create', 'createIdempotent'].includes(type)) {
		const holder = addressIn({ info, key: 'wallet' });

		return { account, kind: 'open', associated: true, ...(nonNullish(holder) && { holder }) };
	}

	if (isNullish(program) || !TOKEN_PROGRAMS.includes(program)) {
		return undefined;
	}

	if (['initializeAccount', 'initializeAccount2', 'initializeAccount3'].includes(type)) {
		const holder = addressIn({ info, key: 'owner' });

		return { account, kind: 'open', associated: false, ...(nonNullish(holder) && { holder }) };
	}

	return type === 'closeAccount' ? { account, kind: 'close' } : undefined;
};

/**
 * Whose one end of a leg was at the transfer, from the holders before the transaction and the
 * openings and closes up to that point.
 *
 * An address with no account open is nobody's, which is not the same as nobody having read whose
 * it was: the message closed what was there, or opens the first account there only later. Nothing
 * of the user's can leave it, and what arrives lands in the account opened there next.
 */
const endOf = ({
	account,
	at,
	arriving,
	events,
	accountHolders
}: {
	account: SolAddress;
	// How many lifecycle events came before the transfer.
	at: number;
	arriving: boolean;
	events: LifecycleEvent[];
	accountHolders: Holders;
}): { holder?: SolAddress; noAccount?: boolean } => {
	const last = events.slice(0, at).findLast((event) => event.account === account);

	if (last?.kind === 'open') {
		return nonNullish(last.holder) ? { holder: last.holder } : {};
	}

	const before = accountHolders[account];

	if (isNullish(last) && nonNullish(before)) {
		return { holder: before };
	}

	const next = events.slice(at).find((event) => event.account === account);
	const upcoming = next?.kind === 'open' ? next : undefined;

	if ((upcoming?.associated ?? false) && nonNullish(upcoming?.holder)) {
		return { holder: upcoming.holder };
	}

	const noAccount = last?.kind === 'close' || (isNullish(last) && nonNullish(upcoming));

	if (!noAccount) {
		return {};
	}

	if (!arriving) {
		return { noAccount: true };
	}

	if (nonNullish(upcoming?.holder)) {
		return { holder: upcoming.holder };
	}

	return nonNullish(upcoming) ? {} : { noAccount: true };
};

export const mapSolTransferLegs = (instructions: readonly SolInstruction[]): SolTransferLeg[] =>
	Array.from(instructions).reduce<SolTransferLeg[]>((acc, instruction) => {
		const leg = toSolTransferLeg(mapSolInstruction({ instruction }));

		return nonNullish(leg) ? [...acc, leg] : acc;
	}, []);

interface PlacedLeg {
	leg: SolTransferLeg;
	// How many lifecycle events came before it.
	at: number;
}

const mapSolInnerTransferLegs = async ({
	instructions,
	network,
	addressToToken,
	from
}: {
	instructions: readonly SolanaSimulatedInnerInstruction[];
	network: SolanaNetworkType;
	addressToToken: Record<SolAddress, SplTokenAddress>;
	// How many lifecycle events came before the first of these instructions.
	from: number;
}): Promise<{ legs: PlacedLeg[]; events: LifecycleEvent[] }> =>
	await instructions.reduce<Promise<{ legs: PlacedLeg[]; events: LifecycleEvent[] }>>(
		async (acc, instruction) => {
			const { legs, events } = await acc;

			const event = lifecycleEventOf('parsed' in instruction ? instruction : undefined);
			const after = nonNullish(event) ? [...events, event] : events;

			if (!('parsed' in instruction) || !isSolTransferInstruction(instruction)) {
				return { legs, events: after };
			}

			const mapped = await mapSolParsedInstruction({
				identity: undefined,
				instruction: { ...instruction, programAddress: instruction.programId },
				network,
				addressToToken
			});

			return {
				legs: nonNullish(mapped)
					? [...legs, { leg: toSolParsedTransferLeg(mapped), at: from + events.length }]
					: legs,
				events: after
			};
		},
		Promise.resolve({ legs: [], events: [] })
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
 * Each leg carries whose its two ends were at that point, read from the holders before the
 * transaction and the openings and closes the message makes in the same order.
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
	const { legs, events } = await Array.from(instructions).reduce<
		Promise<{ legs: PlacedLeg[]; events: LifecycleEvent[] }>
	>(
		async (acc, instruction, index) => {
			const { legs, events } = await acc;

			const leg = toSolTransferLeg(mapSolInstruction({ instruction }));

			const { instructions: inner } =
				innerInstructions.find(({ index: parentIndex }) => parentIndex === index) ?? {};

			const within = await mapSolInnerTransferLegs({
				instructions: inner ?? [],
				network,
				addressToToken,
				from: events.length
			});

			const event = lifecycleEventOf(asSolParsedRpcInstruction(instruction));

			return {
				legs: [...legs, ...(nonNullish(leg) ? [{ leg, at: events.length }] : []), ...within.legs],
				events: [...events, ...within.events, ...(nonNullish(event) ? [event] : [])]
			};
		},
		Promise.resolve({ legs: [], events: [] })
	);

	return legs.map(({ leg, at }) => {
		const source = endOf({ account: leg.source, at, arriving: false, events, accountHolders });
		const destination = endOf({
			account: leg.destination,
			at,
			arriving: true,
			events,
			accountHolders
		});

		return {
			...leg,
			...(nonNullish(source.holder) && { sourceHolder: source.holder }),
			...((source.noAccount ?? false) && { sourceNoAccount: true }),
			...(nonNullish(destination.holder) && { destinationHolder: destination.holder }),
			...((destination.noAccount ?? false) && { destinationNoAccount: true })
		};
	});
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
 * carries one, nobody where the leg says no account was open there, and the accounts named as the
 * user's otherwise. Those are every account the user held at any point of the message, so read
 * alone they would lend an address closed and opened for a different holder to whichever holder it
 * never was at that transfer.
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
		noAccount?: boolean;
	}

	const isUsers = ({ address, holder, noAccount }: Party): boolean =>
		nonNullish(holder) ? owned.has(holder) : (noAccount ?? false) ? false : owned.has(address);

	const add = ({ parties, party }: { parties: Party[]; party: Party }): Party[] =>
		parties.some(({ address }) => address === party.address) ? parties : [...parties, party];

	const { sources, destinations } = legs.reduce<{ sources: Party[]; destinations: Party[] }>(
		(
			{ sources, destinations },
			{
				source,
				destination,
				sourceHolder,
				sourceNoAccount,
				destinationHolder,
				destinationNoAccount
			}
		) => {
			const from: Party = {
				address: source,
				...(nonNullish(sourceHolder) && { holder: sourceHolder }),
				...((sourceNoAccount ?? false) && { noAccount: true })
			};
			const to: Party = {
				address: destination,
				...(nonNullish(destinationHolder) && { holder: destinationHolder }),
				...((destinationNoAccount ?? false) && { noAccount: true })
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

	// An address with no account open at the transfer has no owner to show either: the run's map
	// names whoever held it at the end of the transaction.
	const toParty = (party: Party): SolTransferParty => {
		const { address, holder, noAccount } = party;
		const owner = holder ?? ((noAccount ?? false) ? undefined : addressToOwner?.[address]);

		return { address, ...(nonNullish(owner) && { owner }), own: isUsers(party) };
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
